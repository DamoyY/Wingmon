import { normalizeTheme, normalizeThemeColor } from "../../../utils/index.js";

let settingsSnapshot = null;

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeThemeColorSafe = (value) => {
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
};

const normalizeSettings = (settings) => ({
  apiKey: trimString(settings.apiKey),
  baseUrl: trimString(settings.baseUrl),
  model: trimString(settings.model),
  apiType: settings.apiType ?? "chat",
  theme: normalizeTheme(settings.theme ?? "auto"),
  themeColor: normalizeThemeColorSafe(settings.themeColor),
});

export const syncSettingsSnapshotState = (settings) => {
  settingsSnapshot = normalizeSettings(settings);
  return settingsSnapshot;
};

export const isSettingsDirty = (formValues) => {
  if (!settingsSnapshot) {
    return false;
  }
  const current = normalizeSettings(formValues);
  return Object.keys(settingsSnapshot).some(
    (key) => current[key] !== settingsSnapshot[key],
  );
};

export const isSettingsComplete = (formValues) => {
  const current = normalizeSettings(formValues);
  return Boolean(current.apiKey && current.baseUrl && current.model);
};

const buildRequiredSettingsPayload = (formValues) => ({
  apiKey: trimString(formValues.apiKey),
  baseUrl: trimString(formValues.baseUrl),
  model: trimString(formValues.model),
  apiType: formValues.apiType ?? "chat",
});

export const validateRequiredSettings = (formValues) => {
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

export const buildThemePayload = (formValues) => ({
  theme: normalizeTheme(formValues.theme),
  themeColor: normalizeThemeColor(trimString(formValues.themeColor)),
});
