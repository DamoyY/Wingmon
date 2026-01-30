import {
  DEFAULT_THEME_COLOR,
  normalizeTheme,
  normalizeThemeColor,
} from "../utils/index.js";

const settingsKeys = {
  apiKey: "api_key",
  baseUrl: "base_url",
  model: "model",
  apiType: "api_type",
  theme: "theme",
  themeColor: "theme_color",
  followMode: "follow_mode",
  language: "language",
};
const toSettings = (data) => ({
  apiKey: data?.[settingsKeys.apiKey] || "",
  baseUrl: data?.[settingsKeys.baseUrl] || "",
  model: data?.[settingsKeys.model] || "",
  apiType: data?.[settingsKeys.apiType] || "chat",
  theme: normalizeTheme(data?.[settingsKeys.theme] || "auto"),
  themeColor: normalizeThemeColor(
    data?.[settingsKeys.themeColor] ?? DEFAULT_THEME_COLOR,
  ),
  followMode:
    data?.[settingsKeys.followMode] === undefined
      ? true
      : Boolean(data?.[settingsKeys.followMode]),
  language: data?.[settingsKeys.language] || "en",
});
export const getSettings = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(Object.values(settingsKeys), (result) => {
      resolve(toSettings(result || {}));
    });
  });
const setSettings = (settings) =>
  new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [settingsKeys.apiKey]: settings.apiKey,
        [settingsKeys.baseUrl]: settings.baseUrl,
        [settingsKeys.model]: settings.model,
        [settingsKeys.apiType]: settings.apiType,
        [settingsKeys.theme]: normalizeTheme(settings.theme),
        [settingsKeys.themeColor]: normalizeThemeColor(settings.themeColor),
        [settingsKeys.followMode]: Boolean(settings.followMode),
        [settingsKeys.language]: settings.language,
      },
      resolve,
    );
  });
export const updateSettings = async (patch) => {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch,
    theme: normalizeTheme(patch.theme ?? current.theme),
    themeColor: normalizeThemeColor(patch.themeColor ?? current.themeColor),
    language: patch.language ?? current.language,
  };
  await setSettings(next);
  return next;
};
export const buildEndpoint = (baseUrl, apiType) => {
  const normalized = baseUrl.replace(/\/+$/, "");
  const chatPath = "/chat/completions";
  const responsesPath = "/responses";
  if (normalized.endsWith(chatPath)) {
    return apiType === "responses"
      ? `${normalized.slice(0, -chatPath.length)}${responsesPath}`
      : normalized;
  }
  if (normalized.endsWith(responsesPath)) {
    return apiType === "chat"
      ? `${normalized.slice(0, -responsesPath.length)}${chatPath}`
      : normalized;
  }
  return `${normalized}${apiType === "responses" ? responsesPath : chatPath}`;
};
