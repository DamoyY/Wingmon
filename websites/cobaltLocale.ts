import type { LocaleCode } from "./cobaltTypes.ts";

const mapTagToLocale = (tag: string | null): LocaleCode | null => {
  if (!tag) {
    return null;
  }
  const normalized = tag.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return "zh";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  return null;
};

export const resolveLocaleFromQuery = (queryText: string): LocaleCode | null =>
  mapTagToLocale(new URLSearchParams(queryText).get("lang"));

export const resolveLocaleByPreference = (
  languageTags: readonly string[],
): LocaleCode => {
  for (const tag of languageTags) {
    const locale = mapTagToLocale(tag);
    if (locale) {
      return locale;
    }
  }
  return "en";
};

export const resolveNavigatorPreferences = (): string[] => {
  const tags: string[] = [];
  for (const tag of navigator.languages) {
    const normalized = tag.trim();
    if (normalized.length > 0) {
      tags.push(normalized);
    }
  }
  if (tags.length > 0) {
    return tags;
  }
  const fallback = navigator.language.trim();
  if (fallback.length > 0) {
    return [fallback];
  }
  console.error("浏览器未提供 Preferred languages，默认使用英语");
  return ["en"];
};

export const resolveInitialLocale = (queryText: string): LocaleCode => {
  const queryLocale = resolveLocaleFromQuery(queryText);
  if (queryLocale) {
    return queryLocale;
  }
  return resolveLocaleByPreference(resolveNavigatorPreferences());
};
