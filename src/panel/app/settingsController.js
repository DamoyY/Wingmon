import {
  applyTheme,
  fillSettingsForm,
  keyStatus,
  readSettingsFormValues,
  saveKey,
  setText,
  showChatView,
  showKeyView,
  updateSettingsFormValues,
} from "../ui/index.js";
import {
  normalizeTheme,
  normalizeThemeColor,
  setLocale,
  translateDOM,
} from "../utils/index.js";
import { getSettings, updateSettings } from "../services/index.js";

let settingsSnapshot = null;

const normalizeSettings = (settings) => {
  let themeColor = "";
  if (typeof settings.themeColor === "string") {
    const trimmed = settings.themeColor.trim();
    if (trimmed) {
      try {
        themeColor = normalizeThemeColor(trimmed);
      } catch (error) {
        console.error("主题色归一化失败", error);
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

const readFormSettings = () => normalizeSettings(readSettingsFormValues());

const isSettingsDirty = () => {
  if (!settingsSnapshot) {
    return false;
  }
  const current = readFormSettings();
  return Object.keys(current).some(
    (key) => current[key] !== settingsSnapshot[key],
  );
};

const isSettingsComplete = () => {
  const current = readFormSettings();
  return Boolean(current.apiKey && current.baseUrl && current.model);
};

const updateSaveButtonVisibility = () => {
  saveKey.classList.toggle(
    "hidden",
    !isSettingsDirty() || !isSettingsComplete(),
  );
};

export const syncSettingsSnapshot = (settings) => {
  settingsSnapshot = normalizeSettings(settings);
  updateSaveButtonVisibility();
};

export const handleSettingsFieldChange = () => {
  updateSaveButtonVisibility();
};

export const handleSaveSettings = async () => {
  const formValues = readSettingsFormValues();
  const apiKey = formValues.apiKey.trim();
  const baseUrl = formValues.baseUrl.trim();
  const model = formValues.model.trim();
  const { apiType } = formValues;
  let themeColor = null;
  if (!apiKey || !baseUrl || !model) {
    setText(keyStatus, "API Key、Base URL 和模型不能为空");
    return;
  }
  try {
    themeColor = normalizeThemeColor(formValues.themeColor);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const next = await updateSettings({
    apiKey,
    baseUrl,
    model,
    apiType,
    theme: normalizeTheme(formValues.theme),
    themeColor,
  });
  updateSettingsFormValues({ themeColor: next.themeColor });
  applyTheme(next.theme, next.themeColor);
  syncSettingsSnapshot(next);
  await showChatView({ animate: true });
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  setText(keyStatus, "");
  applyTheme(settings.theme, settings.themeColor);
  await setLocale(settings.language || "en");
  translateDOM();
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
  const formValues = readSettingsFormValues();
  let themeColor = null;
  try {
    themeColor = normalizeThemeColor(formValues.themeColor);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const theme = applyTheme(formValues.theme, themeColor);
  const next = await updateSettings({ theme, themeColor });
  updateSettingsFormValues({ themeColor: next.themeColor });
  syncSettingsSnapshot(next);
};

export const handleThemeColorChange = async () => {
  setText(keyStatus, "");
  const formValues = readSettingsFormValues();
  let themeColor = null;
  try {
    themeColor = normalizeThemeColor(formValues.themeColor);
  } catch (error) {
    setText(keyStatus, error.message);
    return;
  }
  const theme = applyTheme(formValues.theme, themeColor);
  const next = await updateSettings({ theme, themeColor });
  updateSettingsFormValues({ themeColor: next.themeColor });
  syncSettingsSnapshot(next);
};

export const handleLanguageChange = async () => {
  setText(keyStatus, "");
  const { language } = readSettingsFormValues();
  await setLocale(language);
  translateDOM();
  const next = await updateSettings({ language });
  syncSettingsSnapshot(next);
};
