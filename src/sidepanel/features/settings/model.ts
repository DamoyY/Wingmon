import {
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeColorSafe,
  normalizeThemeVariant,
} from "../../lib/utils/index.ts";
import { parseBodyOverrideRules } from "../../../shared/index.ts";

type ApiType = "chat" | "responses" | "messages" | "gemini";

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

type NormalizedSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
  requestBodyOverrides: string;
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
  requestBodyOverrides: string;
};

let settingsSnapshot: NormalizedSettings | null = null;

const ensureSettingsInput = (settings: SettingsInputOrNull): SettingsInput =>
    settings ?? {},
  trimString = (value: string | null | undefined): string =>
    typeof value === "string" ? value.trim() : "",
  normalizeRequestBodyOverrides = (value: string | null | undefined): string =>
    typeof value === "string" ? value.replaceAll("\r\n", "\n").trim() : "",
  normalizeApiType = (value: string | undefined): ApiType => {
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
  },
  normalizeSettings = (settings: SettingsInput): NormalizedSettings => ({
    apiKey: trimString(settings.apiKey),
    apiType: normalizeApiType(settings.apiType),
    baseUrl: trimString(settings.baseUrl),
    model: trimString(settings.model),
    requestBodyOverrides: normalizeRequestBodyOverrides(
      settings.requestBodyOverrides,
    ),
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
  apiType: normalizeApiType(formValues.apiType),
  baseUrl: trimString(formValues.baseUrl),
  model: trimString(formValues.model),
  requestBodyOverrides: normalizeRequestBodyOverrides(
    formValues.requestBodyOverrides,
  ),
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
