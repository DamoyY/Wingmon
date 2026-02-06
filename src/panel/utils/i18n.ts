interface ChromeI18n {
  getUILanguage: () => string;
  getMessage: (
    key: string,
    substitutions?: string | readonly string[],
  ) => string;
}

interface ChromeRuntime {
  getURL: (path: string) => string;
}

declare const chrome: { i18n: ChromeI18n; runtime: ChromeRuntime };

type LocaleMessage = { message: string };
type LocaleMessages = Record<string, LocaleMessage>;
type RawLocaleMessages = Record<string, { message: string | null }>;

let currentLocaleMessages: LocaleMessages | null = null;

const normalizeLocaleMessages = (
  rawMessages: RawLocaleMessages,
): LocaleMessages => {
  const normalizedEntries = Object.entries(rawMessages).map(([key, value]) => {
    if (typeof value.message !== "string") {
      throw new Error(`Locale message 无效：${key}`);
    }
    return [key, { message: value.message }] as const;
  });
  return Object.fromEntries(normalizedEntries);
};

const loadLocaleMessages = async (locale: string): Promise<void> => {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`),
      response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load messages for locale: ${locale}`);
    }
    const rawMessages = (await response.json()) as RawLocaleMessages;
    currentLocaleMessages = normalizeLocaleMessages(rawMessages);
  } catch (error) {
    currentLocaleMessages = null;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load locale messages: ${detail}`);
  }
};

export async function setLocale(locale: string): Promise<void> {
  if (locale === chrome.i18n.getUILanguage().replace("-", "_")) {
    currentLocaleMessages = null;
    return;
  }
  await loadLocaleMessages(locale);
}

export function t(
  key: string,
  substitutions: string | readonly string[] | null = null,
): string {
  if (currentLocaleMessages && key in currentLocaleMessages) {
    let { message } = currentLocaleMessages[key];
    const replacementValues =
      substitutions === null
        ? []
        : typeof substitutions === "string"
          ? [substitutions]
          : substitutions.slice();
    replacementValues.forEach((sub, index) => {
      message = message.replace(
        new RegExp(`\\$${String(index + 1)}`, "g"),
        sub,
      );
    });
    return message;
  }
  if (substitutions === null) {
    return chrome.i18n.getMessage(key) || key;
  }
  const replacements =
    typeof substitutions === "string" ? substitutions : substitutions.slice();
  return chrome.i18n.getMessage(key, replacements) || key;
}

export function translateDOM(): void {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const el = element as HTMLElement,
      key = el.getAttribute("data-i18n") || "",
      message = t(key);
    if (message && message !== key) {
      el.textContent = message;
    }
  });

  const translatableAttrs = ["placeholder", "title", "label", "aria-label"];
  translatableAttrs.forEach((attr) => {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach((element) => {
      const el = element as HTMLElement,
        key = el.getAttribute(`data-i18n-${attr}`) || "",
        message = t(key);
      if (message && message !== key) {
        el.setAttribute(attr, message);
      }
    });
  });
}
