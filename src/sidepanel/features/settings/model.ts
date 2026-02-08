import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeColorSafe,
  normalizeThemeVariant,
} from "../../lib/utils/index.ts";

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

type SettingsInputOrNull = SettingsInput | null | undefined;

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

const ensureSettingsInput = (settings: SettingsInputOrNull): SettingsInput =>
    settings ?? {},
  trimString = (value: string | null | undefined): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeSettings = (settings: SettingsInput): NormalizedSettings => ({
    apiKey: trimString(settings.apiKey),
    apiType: settings.apiType === "responses" ? "responses" : "chat",
    baseUrl: trimString(settings.baseUrl),
    model: trimString(settings.model),
    theme: normalizeTheme(settings.theme ?? "auto"),
    themeColor: normalizeThemeColorSafe(settings.themeColor ?? null),
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

export const ensureSettingsReady = (settings: SettingsInputOrNull): boolean => {
  const input = ensureSettingsInput(settings);
  return isSettingsComplete(input);
};

const buildRequiredSettingsPayload = (
  formValues: SettingsInput,
): RequiredSettingsPayload => ({
  apiKey: trimString(formValues.apiKey),
  apiType: formValues.apiType === "responses" ? "responses" : "chat",
  baseUrl: trimString(formValues.baseUrl),
  model: trimString(formValues.model),
});

export const validateRequiredSettings = (
  formValues: SettingsInput,
): ValidationResult => {
  const payload = buildRequiredSettingsPayload(formValues);
  if (!payload.apiKey || !payload.baseUrl || !payload.model) {
    return {
      message: "API Key、Base URL 和模型不能为空",
      payload,
      valid: false,
    };
  }
  return { payload, valid: true };
};

export const buildThemePayload = (formValues: SettingsInput) => ({
  theme: normalizeTheme(formValues.theme ?? null),
  themeColor: normalizeThemeColor(trimString(formValues.themeColor) || null),
  themeVariant: normalizeThemeVariant(formValues.themeVariant ?? null),
});
