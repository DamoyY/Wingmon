import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../../lib/utils/index.ts";

type StoredSettingValue = string | boolean | undefined;
type StoredSettings = Record<string, StoredSettingValue>;

export type ApiType = "chat" | "responses" | "messages";

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
    apiType: "api_type",
    baseUrl: "base_url",
    followMode: "follow_mode",
    language: "language",
    model: "model",
    theme: "theme",
    themeColor: "theme_color",
    themeVariant: "theme_variant",
  },
  endpointPathMap: Record<ApiType, string> = {
    chat: "/chat/completions",
    messages: "/v1/messages",
    responses: "/responses",
  },
  endpointPathEntries: Array<{ apiType: ApiType; path: string }> = [
    { apiType: "chat", path: endpointPathMap.chat },
    { apiType: "responses", path: endpointPathMap.responses },
    { apiType: "messages", path: endpointPathMap.messages },
  ],
  normalizeApiType = (value: StoredSettingValue): ApiType => {
    if (value === "responses") {
      return "responses";
    }
    if (value === "messages") {
      return "messages";
    }
    return "chat";
  },
  toSettings = (data: StoredSettings): Settings => ({
    apiKey:
      typeof data[settingsKeys.apiKey] === "string"
        ? data[settingsKeys.apiKey]
        : "",
    apiType: normalizeApiType(data[settingsKeys.apiType]),
    baseUrl:
      typeof data[settingsKeys.baseUrl] === "string"
        ? data[settingsKeys.baseUrl]
        : "",
    followMode:
      data[settingsKeys.followMode] === undefined
        ? true
        : Boolean(data[settingsKeys.followMode]),
    language:
      typeof data[settingsKeys.language] === "string"
        ? data[settingsKeys.language]
        : "en",
    model:
      typeof data[settingsKeys.model] === "string"
        ? data[settingsKeys.model]
        : "",
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
      language: patch.language ?? current.language,
      theme: normalizeTheme(patch.theme ?? current.theme),
      themeColor: normalizeThemeColor(patch.themeColor ?? current.themeColor),
      themeVariant: normalizeThemeVariant(
        patch.themeVariant ?? current.themeVariant,
      ),
    };
  await setSettings(next);
  return next;
};

export const buildEndpoint = (baseUrl: string, apiType: ApiType): string => {
  const normalized = baseUrl.replace(/\/+$/u, "");
  for (const { apiType: existingApiType, path } of endpointPathEntries) {
    if (normalized.endsWith(path)) {
      if (existingApiType === apiType) {
        return normalized;
      }
      return `${normalized.slice(0, -path.length)}${endpointPathMap[apiType]}`;
    }
  }
  return `${normalized}${endpointPathMap[apiType]}`;
};
