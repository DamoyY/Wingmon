let currentLocaleMessages = null;
const loadLocaleMessages = async (locale) => {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load messages for locale: ${locale}`);
    }
    const messages = await response.json();
    currentLocaleMessages = messages;
  } catch (error) {
    currentLocaleMessages = null;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load locale messages: ${detail}`);
  }
};
export async function setLocale(locale) {
  if (locale === chrome.i18n.getUILanguage().replace("-", "_")) {
    currentLocaleMessages = null;
    return;
  }
  await loadLocaleMessages(locale);
}
export function t(key, substitutions) {
  if (currentLocaleMessages && currentLocaleMessages[key]) {
    let { message } = currentLocaleMessages[key];
    if (substitutions) {
      const subs = Array.isArray(substitutions)
        ? substitutions
        : [substitutions];
      subs.forEach((sub, index) => {
        message = message.replace(new RegExp(`\\$${index + 1}`, "g"), sub);
      });
    }
    return message;
  }
  return chrome.i18n.getMessage(key, substitutions) || key;
}
export function translateDOM() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const el = element;
    const key = el.getAttribute("data-i18n");
    const message = t(key);
    if (message && message !== key) {
      el.textContent = message;
    }
  });
  const translatableAttrs = ["placeholder", "title", "label", "aria-label"];
  translatableAttrs.forEach((attr) => {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach((element) => {
      const el = element;
      const key = el.getAttribute(`data-i18n-${attr}`);
      const message = t(key);
      if (message && message !== key) {
        el.setAttribute(attr, message);
      }
    });
  });
}
