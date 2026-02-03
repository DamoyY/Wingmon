import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../../../utils/index.ts";

type ApiType = "chat" | "responses";

export type SettingsInput = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  apiType?: string;
  theme?: string;
  themeColor?: string;
  themeVariant?: string;
  language?: string;
};

type NormalizedSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
  theme: string;
  themeColor: string;
  themeVariant: string;
};

type ValidationResult =
  | {
      valid: true;
      payload: RequiredSettingsPayload;
    }
  | {
      valid: false;
      message: string;
      payload: RequiredSettingsPayload;
    };

type RequiredSettingsPayload = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
};

let settingsSnapshot: NormalizedSettings | null = null;

const trimString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeThemeColorSafe = (value: unknown): string => {
    if (typeof value !== "string") {
      return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    try {
      return normalizeThemeColor(trimmed);
    } catch (error) {
      console.error("主题色归一化失败", error);
      return trimmed;
    }
  },
  normalizeSettings = (settings: SettingsInput): NormalizedSettings => ({
    apiKey: trimString(settings.apiKey),
    baseUrl: trimString(settings.baseUrl),
    model: trimString(settings.model),
    apiType: settings.apiType === "responses" ? "responses" : "chat",
    theme: normalizeTheme(settings.theme ?? "auto"),
    themeColor: normalizeThemeColorSafe(settings.themeColor),
    themeVariant: normalizeThemeVariant(settings.themeVariant ?? "neutral"),
  });

export const syncSettingsSnapshotState = (
  settings: SettingsInput,
): NormalizedSettings => {
  settingsSnapshot = normalizeSettings(settings);
  return settingsSnapshot;
};

export const isSettingsDirty = (formValues: SettingsInput): boolean => {
  if (!settingsSnapshot) {
    return false;
  }
  const snapshot = settingsSnapshot,
    current = normalizeSettings(formValues);
  return Object.keys(snapshot).some(
    (key) =>
      current[key as keyof NormalizedSettings] !==
      snapshot[key as keyof NormalizedSettings],
  );
};

export const isSettingsComplete = (formValues: SettingsInput): boolean => {
  const current = normalizeSettings(formValues);
  return Boolean(current.apiKey && current.baseUrl && current.model);
};

const buildRequiredSettingsPayload = (
  formValues: SettingsInput,
): RequiredSettingsPayload => ({
  apiKey: trimString(formValues.apiKey),
  baseUrl: trimString(formValues.baseUrl),
  model: trimString(formValues.model),
  apiType: formValues.apiType === "responses" ? "responses" : "chat",
});

export const validateRequiredSettings = (
  formValues: SettingsInput,
): ValidationResult => {
  const payload = buildRequiredSettingsPayload(formValues);
  if (!payload.apiKey || !payload.baseUrl || !payload.model) {
    return {
      valid: false,
      message: "API Key、Base URL 和模型不能为空",
      payload,
    };
  }
  return { valid: true, payload };
};

export const buildThemePayload = (formValues: SettingsInput) => ({
  theme: normalizeTheme(formValues.theme),
  themeColor: normalizeThemeColor(trimString(formValues.themeColor)),
  themeVariant: normalizeThemeVariant(formValues.themeVariant),
});
