import {
  type ApiType,
  type Settings,
  codexBackendBaseUrl,
  isCodexApiType,
  normalizeSettings as normalizeSharedSettings,
  parseBodyOverrideRules,
} from "../../../shared/index.ts";
import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
  t,
} from "../../lib/utils/index.ts";

export type SettingsInput = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  apiType?: string;
  requestBodyOverrides?: string;
  theme?: string;
  themeColor?: string;
  themeVariant?: string;
  language?: string;
};

type SettingsInputOrNull = SettingsInput | null | undefined;

type NormalizedSettings = Pick<
  Settings,
  | "apiKey"
  | "apiType"
  | "baseUrl"
  | "language"
  | "model"
  | "requestBodyOverrides"
  | "theme"
  | "themeColor"
  | "themeVariant"
>;

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
  requestBodyOverrides: string;
};

let settingsSnapshot: NormalizedSettings | null = null;

const ensureSettingsInput = (settings: SettingsInputOrNull): SettingsInput =>
    settings ?? {},
  trimString = (value: string | null | undefined): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeSettings = (settings: SettingsInput): NormalizedSettings => {
    const normalized = normalizeSharedSettings(settings, {
      themeColorMode: "safe",
    });
    return {
      apiKey: normalized.apiKey,
      apiType: normalized.apiType,
      baseUrl: normalized.baseUrl,
      language: normalized.language,
      model: normalized.model,
      requestBodyOverrides: normalized.requestBodyOverrides,
      theme: normalized.theme,
      themeColor: normalized.themeColor,
      themeVariant: normalized.themeVariant,
    };
  };

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
  if (isCodexApiType(current.apiType)) {
    return Boolean(
      current.apiKey &&
      current.model &&
      current.baseUrl === codexBackendBaseUrl,
    );
  }
  return Boolean(current.apiKey && current.baseUrl && current.model);
};

export const ensureSettingsReady = (settings: SettingsInputOrNull): boolean => {
  const input = ensureSettingsInput(settings);
  return isSettingsComplete(input);
};

const buildRequiredSettingsPayload = (
  formValues: SettingsInput,
): RequiredSettingsPayload => {
  const normalized = normalizeSettings(formValues);
  return {
    apiKey: normalized.apiKey,
    apiType: normalized.apiType,
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    requestBodyOverrides: normalized.requestBodyOverrides,
  };
};

export const validateRequiredSettings = (
  formValues: SettingsInput,
): ValidationResult => {
  const payload = buildRequiredSettingsPayload(formValues);
  if (!payload.model) {
    return {
      message: t("settingsValidationModelRequired"),
      payload,
      valid: false,
    };
  }
  if (isCodexApiType(payload.apiType)) {
    if (!payload.apiKey || payload.baseUrl !== codexBackendBaseUrl) {
      return {
        message: t("settingsValidationCodexLoginRequired"),
        payload,
        valid: false,
      };
    }
  } else if (!payload.apiKey || !payload.baseUrl) {
    return {
      message: t("settingsValidationApiRequired"),
      payload,
      valid: false,
    };
  }
  try {
    parseBodyOverrideRules(payload.requestBodyOverrides);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      message,
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
