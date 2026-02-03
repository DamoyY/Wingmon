interface ChromeI18n {
  getUILanguage: () => string;
  getMessage: (key: string, substitutions?: string | string[]) => string;
}

interface ChromeRuntime {
  getURL: (path: string) => string;
}

declare const chrome: { i18n: ChromeI18n; runtime: ChromeRuntime };

let currentLocaleMessages: Record<string, { message: string }> | null = null;

const loadLocaleMessages = async (locale: string): Promise<void> => {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`),
      response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load messages for locale: ${locale}`);
    }
    const messages = (await response.json()) as Record<
      string,
      { message: string }
    >;
    currentLocaleMessages = messages;
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

export function t(key: string, substitutions?: string | string[]): string {
  if (currentLocaleMessages && key in currentLocaleMessages) {
    let { message } = currentLocaleMessages[key];
    if (substitutions) {
      const subs = Array.isArray(substitutions)
        ? substitutions
        : [substitutions];
      subs.forEach((sub, index) => {
        message = message.replace(
          new RegExp(`\\$${String(index + 1)}`, "g"),
          sub,
        );
      });
    }
    return message;
  }
  return chrome.i18n.getMessage(key, substitutions) || key;
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
