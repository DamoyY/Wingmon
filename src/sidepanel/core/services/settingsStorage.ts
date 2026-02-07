import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../../lib/utils/index.ts";

type StoredSettingValue = string | boolean | undefined;
type StoredSettings = Record<string, StoredSettingValue>;

export type ApiType = "chat" | "responses";

export type Settings = {
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
  toSettings = (data: StoredSettings): Settings => ({
    apiKey:
      typeof data[settingsKeys.apiKey] === "string"
        ? data[settingsKeys.apiKey]
        : "",
    baseUrl:
      typeof data[settingsKeys.baseUrl] === "string"
        ? data[settingsKeys.baseUrl]
        : "",
    model:
      typeof data[settingsKeys.model] === "string"
        ? data[settingsKeys.model]
        : "",
    apiType: data[settingsKeys.apiType] === "responses" ? "responses" : "chat",
    theme: normalizeTheme(
      typeof data[settingsKeys.theme] === "string"
        ? data[settingsKeys.theme]
        : null,
    ),
    themeColor: normalizeThemeColor(
      typeof data[settingsKeys.themeColor] === "string"
        ? data[settingsKeys.themeColor]
        : null,
    ),
    themeVariant: normalizeThemeVariant(
      typeof data[settingsKeys.themeVariant] === "string"
        ? data[settingsKeys.themeVariant]
        : null,
    ),
    followMode:
      data[settingsKeys.followMode] === undefined
        ? true
        : Boolean(data[settingsKeys.followMode]),
    language:
      typeof data[settingsKeys.language] === "string"
        ? data[settingsKeys.language]
        : "en",
  });

export const getSettings = async (): Promise<Settings> => {
  const result = await chrome.storage.local.get<StoredSettings>(
    Object.values(settingsKeys),
  );
  return toSettings(result);
};

const setSettings = async (settings: Settings): Promise<void> => {
  await chrome.storage.local.set<StoredSettings>({
    [settingsKeys.apiKey]: settings.apiKey,
    [settingsKeys.baseUrl]: settings.baseUrl,
    [settingsKeys.model]: settings.model,
    [settingsKeys.apiType]: settings.apiType,
    [settingsKeys.theme]: normalizeTheme(settings.theme),
    [settingsKeys.themeColor]: normalizeThemeColor(settings.themeColor),
    [settingsKeys.themeVariant]: normalizeThemeVariant(settings.themeVariant),
    [settingsKeys.followMode]: settings.followMode,
    [settingsKeys.language]: settings.language,
  });
};

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
