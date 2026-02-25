import normalizeThemeColor, {
  normalizeThemeColorSafe,
} from "../ui/themeColor.ts";
import normalizeTheme from "../ui/theme.ts";
import normalizeThemeVariant from "../ui/themeVariant.ts";

type StoredSettingValue = string | boolean | undefined;
type StoredSettings = Record<string, StoredSettingValue>;

export type ApiType = "chat" | "responses" | "messages" | "gemini" | "codex";
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
type ApiTypeStorageKeyMap = Record<ApiType, string>;

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

const apiTypeStorageValues: readonly ApiType[] = [
    "chat",
    "responses",
    "messages",
    "gemini",
    "codex",
  ],
  createApiTypeStorageKeyMap = (prefix: string): ApiTypeStorageKeyMap => ({
    chat: `${prefix}_chat`,
    codex: `${prefix}_codex`,
    gemini: `${prefix}_gemini`,
    messages: `${prefix}_messages`,
    responses: `${prefix}_responses`,
  }),
  settingsKeys = {
    apiKeyByApiType: createApiTypeStorageKeyMap("api_key"),
    apiType: "api_type",
    baseUrlByApiType: createApiTypeStorageKeyMap("base_url"),
    followMode: "follow_mode",
    language: "language",
    modelByApiType: createApiTypeStorageKeyMap("model"),
    requestBodyOverridesByApiType: createApiTypeStorageKeyMap(
      "request_body_overrides",
    ),
    theme: "theme",
    themeColor: "theme_color",
    themeVariant: "theme_variant",
  },
  settingsStorageKeys = [
    settingsKeys.apiType,
    settingsKeys.followMode,
    settingsKeys.language,
    settingsKeys.theme,
    settingsKeys.themeColor,
    settingsKeys.themeVariant,
    ...apiTypeStorageValues.map(
      (apiType) => settingsKeys.apiKeyByApiType[apiType],
    ),
    ...apiTypeStorageValues.map(
      (apiType) => settingsKeys.baseUrlByApiType[apiType],
    ),
    ...apiTypeStorageValues.map(
      (apiType) => settingsKeys.modelByApiType[apiType],
    ),
    ...apiTypeStorageValues.map(
      (apiType) => settingsKeys.requestBodyOverridesByApiType[apiType],
    ),
  ],
  trimSettingValue = (value: string | null | undefined): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeRequestBodyOverrides = (value: string | null | undefined): string =>
    typeof value === "string" ? value.replaceAll("\r\n", "\n").trim() : "",
  normalizeLanguage = (value: string | null | undefined): string =>
    trimSettingValue(value) || "en",
  readStoredString = (data: StoredSettings, key: string): string | null => {
    const value = data[key];
    if (typeof value === "string") {
      return value;
    }
    return null;
  },
  resolveBackendSettingValue = ({
    apiType,
    data,
    keyByApiType,
  }: {
    apiType: ApiType;
    data: StoredSettings;
    keyByApiType: ApiTypeStorageKeyMap;
  }): string => {
    const backendValue = readStoredString(data, keyByApiType[apiType]);
    if (backendValue !== null) {
      return backendValue;
    }
    return "";
  },
  resolveStoredApiType = (data: StoredSettings): ApiType =>
    normalizeApiType(readStoredString(data, settingsKeys.apiType)),
  resolveSettingsByApiType = (
    data: StoredSettings,
    apiType: ApiType,
  ): Settings =>
    normalizeSettings({
      apiKey: resolveBackendSettingValue({
        apiType,
        data,
        keyByApiType: settingsKeys.apiKeyByApiType,
      }),
      apiType,
      baseUrl: resolveBackendSettingValue({
        apiType,
        data,
        keyByApiType: settingsKeys.baseUrlByApiType,
      }),
      followMode:
        data[settingsKeys.followMode] === undefined
          ? true
          : Boolean(data[settingsKeys.followMode]),
      language: readStoredString(data, settingsKeys.language),
      model: resolveBackendSettingValue({
        apiType,
        data,
        keyByApiType: settingsKeys.modelByApiType,
      }),
      requestBodyOverrides: resolveBackendSettingValue({
        apiType,
        data,
        keyByApiType: settingsKeys.requestBodyOverridesByApiType,
      }),
      theme: readStoredString(data, settingsKeys.theme),
      themeColor: readStoredString(data, settingsKeys.themeColor),
      themeVariant: readStoredString(data, settingsKeys.themeVariant),
    }),
  getStoredSettings = async (): Promise<StoredSettings> =>
    chrome.storage.local.get<StoredSettings>(settingsStorageKeys),
  normalizeThemeColorValue = (
    value: string | null,
    themeColorMode: ThemeColorMode,
  ): string =>
    themeColorMode === "safe"
      ? normalizeThemeColorSafe(value)
      : normalizeThemeColor(value);

export const normalizeApiType = (value: string | null | undefined): ApiType => {
  if (value === "codex") {
    return "codex";
  }
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

export const toSettings = (data: StoredSettings): Settings => {
  const apiType = resolveStoredApiType(data);
  return resolveSettingsByApiType(data, apiType);
};

export const getSettings = async (): Promise<Settings> => {
  const stored = await getStoredSettings();
  return toSettings(stored);
};

export const getSettingsByApiType = async (
  apiType: ApiType,
): Promise<Settings> => {
  const stored = await getStoredSettings();
  return resolveSettingsByApiType(stored, apiType);
};

const applyBackendSettings = ({
  apiType,
  payload,
  settings,
}: {
  apiType: ApiType;
  payload: StoredSettings;
  settings: Settings;
}): void => {
  payload[settingsKeys.apiKeyByApiType[apiType]] = settings.apiKey;
  payload[settingsKeys.baseUrlByApiType[apiType]] = settings.baseUrl;
  payload[settingsKeys.modelByApiType[apiType]] = settings.model;
  payload[settingsKeys.requestBodyOverridesByApiType[apiType]] =
    settings.requestBodyOverrides;
};

const setSettings = async (settings: Settings): Promise<void> => {
  const payload: StoredSettings = {
    [settingsKeys.apiType]: settings.apiType,
    [settingsKeys.theme]: normalizeTheme(settings.theme),
    [settingsKeys.themeColor]: normalizeThemeColor(settings.themeColor),
    [settingsKeys.themeVariant]: normalizeThemeVariant(settings.themeVariant),
    [settingsKeys.followMode]: settings.followMode,
    [settingsKeys.language]: settings.language,
  };
  applyBackendSettings({
    apiType: settings.apiType,
    payload,
    settings,
  });
  await chrome.storage.local.set<StoredSettings>(payload);
};

export const updateSettings = async (
  patch: SettingsPatch,
): Promise<Settings> => {
  const stored = await getStoredSettings(),
    current = toSettings(stored),
    nextApiType =
      typeof patch.apiType === "string"
        ? normalizeApiType(patch.apiType)
        : current.apiType,
    activeSettings = resolveSettingsByApiType(stored, nextApiType),
    next = normalizeSettings(
      {
        ...activeSettings,
        ...patch,
        apiType: nextApiType,
      },
      { themeColorMode: "strict" },
    );
  await setSettings(next);
  return next;
};
