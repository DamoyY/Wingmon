import {
  apiTypeSelect,
  applyTheme,
  baseUrlInput,
  fillSettingsForm,
  keyInput,
  keyStatus,
  saveKey,
  modelInput,
  setText,
  showChatView,
  showKeyView,
  themeColorInput,
  themeSelect,
} from "../ui/index.js";
import { normalizeTheme, normalizeThemeColor } from "../utils/index.js";
import { getSettings, updateSettings } from "../services/index.js";

let settingsSnapshot = null;

const normalizeSettings = (settings) => {
  let themeColor = "";
  if (typeof settings.themeColor === "string") {
    const trimmed = settings.themeColor.trim();
    if (trimmed) {
      try {
        themeColor = normalizeThemeColor(trimmed);
      } catch {
        themeColor = trimmed;
      }
    }
  }
  return {
    apiKey: settings.apiKey?.trim() ?? "",
    baseUrl: settings.baseUrl?.trim() ?? "",
    model: settings.model?.trim() ?? "",
    apiType: settings.apiType ?? "chat",
    theme: normalizeTheme(settings.theme ?? "auto"),
    themeColor,
  };
};

const readFormSettings = () =>
  normalizeSettings({
    apiKey: keyInput.value,
    baseUrl: baseUrlInput.value,
    model: modelInput.value,
    apiType: apiTypeSelect.value,
    theme: themeSelect.value,
    themeColor: themeColorInput.value,
  });

const isSettingsDirty = () => {
  if (!settingsSnapshot) {
    return false;
  }
  const current = readFormSettings();
  return Object.keys(current).some(
    (key) => current[key] !== settingsSnapshot[key],
  );
};

const updateSaveButtonVisibility = () => {
  saveKey.classList.toggle("hidden", !isSettingsDirty());
};

export const syncSettingsSnapshot = (settings) => {
  settingsSnapshot = normalizeSettings(settings);
  updateSaveButtonVisibility();
};

export const handleSettingsFieldChange = () => {
  updateSaveButtonVisibility();
};

export const handleSaveSettings = async () => {
  const apiKey = keyInput.value.trim();
  const baseUrl = baseUrlInput.value.trim();
  const model = modelInput.value.trim();
  const apiType = apiTypeSelect.value;
  let themeColor = null;
  if (!apiKey || !baseUrl || !model) {
    setText(keyStatus, "API Key、Base URL 和模型不能为空");
    return;
  }
  try {
    themeColor = normalizeThemeColor(themeColorInput.value);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const next = await updateSettings({
    apiKey,
    baseUrl,
    model,
    apiType,
    theme: normalizeTheme(themeSelect.value),
    themeColor,
  });
  themeColorInput.value = next.themeColor;
  applyTheme(next.theme, next.themeColor);
  syncSettingsSnapshot(next);
  await showChatView({ animate: true });
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  setText(keyStatus, "");
  applyTheme(settings.theme, settings.themeColor);
  syncSettingsSnapshot(settings);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    await showChatView({ animate: true });
  }
};

export const handleOpenSettings = async () => {
  const settings = await getSettings();
  await showKeyView({ isFirstUse: false, animate: true });
  fillSettingsForm(settings);
  syncSettingsSnapshot(settings);
};

export const handleThemeChange = async () => {
  setText(keyStatus, "");
  let themeColor = null;
  try {
    themeColor = normalizeThemeColor(themeColorInput.value);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const theme = applyTheme(themeSelect.value, themeColor);
  const next = await updateSettings({ theme, themeColor });
  themeColorInput.value = next.themeColor;
  syncSettingsSnapshot(next);
};

export const handleThemeColorChange = async () => {
  setText(keyStatus, "");
  let themeColor = null;
  try {
    themeColor = normalizeThemeColor(themeColorInput.value);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const theme = applyTheme(themeSelect.value, themeColor);
  const next = await updateSettings({ theme, themeColor });
  themeColorInput.value = next.themeColor;
  syncSettingsSnapshot(next);
};
