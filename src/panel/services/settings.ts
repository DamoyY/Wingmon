import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../utils/index.ts";

type ApiType = "chat" | "responses";

interface ChromeStorage {
  local: {
    get: (
      keys: string[] | Record<string, unknown> | null,
      callback: (result: Record<string, unknown>) => void,
    ) => void;
    set: (items: Record<string, unknown>, callback?: () => void) => void;
  };
}

declare const chrome: { storage: ChromeStorage };

type Settings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
  theme: string;
  themeColor: string;
  themeVariant: string;
  followMode: boolean;
  language: string;
};

type SettingsPatch = Partial<Settings>;

const settingsKeys = {
    apiKey: "api_key",
    baseUrl: "base_url",
    model: "model",
    apiType: "api_type",
    theme: "theme",
    themeColor: "theme_color",
    themeVariant: "theme_variant",
    followMode: "follow_mode",
    language: "language",
  },
  toSettings = (data: Record<string, unknown>): Settings => ({
    apiKey:
      typeof data[settingsKeys.apiKey] === "string"
        ? (data[settingsKeys.apiKey] as string)
        : "",
    baseUrl:
      typeof data[settingsKeys.baseUrl] === "string"
        ? (data[settingsKeys.baseUrl] as string)
        : "",
    model:
      typeof data[settingsKeys.model] === "string"
        ? (data[settingsKeys.model] as string)
        : "",
    apiType: data[settingsKeys.apiType] === "responses" ? "responses" : "chat",
    theme: normalizeTheme(data[settingsKeys.theme]),
    themeColor: normalizeThemeColor(
      typeof data[settingsKeys.themeColor] === "string"
        ? (data[settingsKeys.themeColor] as string)
        : undefined,
    ),
    themeVariant: normalizeThemeVariant(data[settingsKeys.themeVariant]),
    followMode:
      data[settingsKeys.followMode] === undefined
        ? true
        : Boolean(data[settingsKeys.followMode]),
    language:
      typeof data[settingsKeys.language] === "string"
        ? (data[settingsKeys.language] as string)
        : "en",
  });

export const getSettings = (): Promise<Settings> =>
  new Promise((resolve) => {
    chrome.storage.local.get(Object.values(settingsKeys), (result) => {
      resolve(toSettings(result));
    });
  });

const setSettings = (settings: Settings): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [settingsKeys.apiKey]: settings.apiKey,
        [settingsKeys.baseUrl]: settings.baseUrl,
        [settingsKeys.model]: settings.model,
        [settingsKeys.apiType]: settings.apiType,
        [settingsKeys.theme]: normalizeTheme(settings.theme),
        [settingsKeys.themeColor]: normalizeThemeColor(settings.themeColor),
        [settingsKeys.themeVariant]: normalizeThemeVariant(
          settings.themeVariant,
        ),
        [settingsKeys.followMode]: settings.followMode,
        [settingsKeys.language]: settings.language,
      },
      resolve,
    );
  });

export const updateSettings = async (
  patch: SettingsPatch,
): Promise<Settings> => {
  const current = await getSettings(),
    next: Settings = {
      ...current,
      ...patch,
      apiType: patch.apiType ?? current.apiType,
      theme: normalizeTheme(patch.theme ?? current.theme),
      themeColor: normalizeThemeColor(patch.themeColor ?? current.themeColor),
      themeVariant: normalizeThemeVariant(
        patch.themeVariant ?? current.themeVariant,
      ),
      language: patch.language ?? current.language,
    };
  await setSettings(next);
  return next;
};

export const buildEndpoint = (baseUrl: string, apiType: ApiType): string => {
  const normalized = baseUrl.replace(/\/+$/, ""),
    chatPath = "/chat/completions",
    responsesPath = "/responses";
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
