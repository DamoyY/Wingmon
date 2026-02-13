import normalizeTheme from "../ui/theme.ts";
import normalizeThemeColor, {
  normalizeThemeColorSafe,
} from "../ui/themeColor.ts";
import normalizeThemeVariant from "../ui/themeVariant.ts";

type StoredSettingValue = string | boolean | undefined;
type StoredSettings = Record<string, StoredSettingValue>;

export type ApiType = "chat" | "responses" | "messages" | "gemini";
type ThemeColorMode = "safe" | "strict";

export type Settings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
  requestBodyOverrides: string;
  theme: string;
  themeColor: string;
  themeVariant: string;
  followMode: boolean;
  language: string;
};

type SettingsPatch = Partial<Settings>;

type SettingsNormalizationInput = {
  apiKey?: string | null;
  apiType?: string | null;
  baseUrl?: string | null;
  followMode?: boolean;
  language?: string | null;
  model?: string | null;
  requestBodyOverrides?: string | null;
  theme?: string | null;
  themeColor?: string | null;
  themeVariant?: string | null;
};

type SettingsNormalizationOptions = {
  themeColorMode?: ThemeColorMode;
};

const settingsKeys = {
    apiKey: "api_key",
    apiType: "api_type",
    baseUrl: "base_url",
    followMode: "follow_mode",
    language: "language",
    model: "model",
    requestBodyOverrides: "request_body_overrides",
    theme: "theme",
    themeColor: "theme_color",
    themeVariant: "theme_variant",
  },
  endpointPathMap: Record<ApiType, string> = {
    chat: "/chat/completions",
    gemini: "/v1beta/models",
    messages: "/v1/messages",
    responses: "/responses",
  },
  endpointPathEntries: Array<{ apiType: ApiType; path: string }> = [
    { apiType: "chat", path: endpointPathMap.chat },
    { apiType: "gemini", path: endpointPathMap.gemini },
    { apiType: "responses", path: endpointPathMap.responses },
    { apiType: "messages", path: endpointPathMap.messages },
  ],
  trimSettingValue = (value: string | null | undefined): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeRequestBodyOverrides = (value: string | null | undefined): string =>
    typeof value === "string" ? value.replaceAll("\r\n", "\n").trim() : "",
  normalizeLanguage = (value: string | null | undefined): string =>
    trimSettingValue(value) || "en",
  normalizeThemeColorValue = (
    value: string | null,
    themeColorMode: ThemeColorMode,
  ): string =>
    themeColorMode === "safe"
      ? normalizeThemeColorSafe(value)
      : normalizeThemeColor(value);

export const normalizeApiType = (value: string | null | undefined): ApiType => {
  if (value === "responses") {
    return "responses";
  }
  if (value === "messages") {
    return "messages";
  }
  if (value === "gemini") {
    return "gemini";
  }
  return "chat";
};

export const normalizeSettings = (
  data: SettingsNormalizationInput,
  options: SettingsNormalizationOptions = {},
): Settings => {
  const themeColorMode = options.themeColorMode ?? "strict";
  return {
    apiKey: trimSettingValue(data.apiKey),
    apiType: normalizeApiType(data.apiType),
    baseUrl: trimSettingValue(data.baseUrl),
    followMode: data.followMode ?? true,
    language: normalizeLanguage(data.language),
    model: trimSettingValue(data.model),
    requestBodyOverrides: normalizeRequestBodyOverrides(
      data.requestBodyOverrides,
    ),
    theme: normalizeTheme(data.theme ?? null),
    themeColor: normalizeThemeColorValue(
      data.themeColor ?? null,
      themeColorMode,
    ),
    themeVariant: normalizeThemeVariant(data.themeVariant ?? null),
  };
};

export const toSettings = (data: StoredSettings): Settings =>
  normalizeSettings({
    apiKey:
      typeof data[settingsKeys.apiKey] === "string"
        ? data[settingsKeys.apiKey]
        : null,
    apiType:
      typeof data[settingsKeys.apiType] === "string"
        ? data[settingsKeys.apiType]
        : null,
    baseUrl:
      typeof data[settingsKeys.baseUrl] === "string"
        ? data[settingsKeys.baseUrl]
        : null,
    followMode:
      data[settingsKeys.followMode] === undefined
        ? true
        : Boolean(data[settingsKeys.followMode]),
    language:
      typeof data[settingsKeys.language] === "string"
        ? data[settingsKeys.language]
        : null,
    model:
      typeof data[settingsKeys.model] === "string"
        ? data[settingsKeys.model]
        : null,
    requestBodyOverrides:
      typeof data[settingsKeys.requestBodyOverrides] === "string"
        ? data[settingsKeys.requestBodyOverrides]
        : null,
    theme:
      typeof data[settingsKeys.theme] === "string"
        ? data[settingsKeys.theme]
        : null,
    themeColor:
      typeof data[settingsKeys.themeColor] === "string"
        ? data[settingsKeys.themeColor]
        : null,
    themeVariant:
      typeof data[settingsKeys.themeVariant] === "string"
        ? data[settingsKeys.themeVariant]
        : null,
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
    [settingsKeys.requestBodyOverrides]: settings.requestBodyOverrides,
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
    next = normalizeSettings(
      {
        ...current,
        ...patch,
      },
      { themeColorMode: "strict" },
    );
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
