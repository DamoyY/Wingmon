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
  themeSelect,
} from "../ui/index.js";
import { normalizeTheme } from "../utils/index.js";
import { getSettings, updateSettings } from "../services/index.js";

let settingsSnapshot = null;

const normalizeSettings = (settings) => ({
  apiKey: settings.apiKey?.trim() ?? "",
  baseUrl: settings.baseUrl?.trim() ?? "",
  model: settings.model?.trim() ?? "",
  apiType: settings.apiType ?? "chat",
  theme: normalizeTheme(settings.theme ?? "auto"),
});

const readFormSettings = () =>
  normalizeSettings({
    apiKey: keyInput.value,
    baseUrl: baseUrlInput.value,
    model: modelInput.value,
    apiType: apiTypeSelect.value,
    theme: themeSelect.value,
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
  if (!apiKey || !baseUrl || !model) {
    setText(keyStatus, "API Key、Base URL 和模型不能为空");
    return;
  }
  const next = await updateSettings({
    apiKey,
    baseUrl,
    model,
    apiType,
    theme: normalizeTheme(themeSelect.value),
  });
  applyTheme(next.theme);
  syncSettingsSnapshot(next);
  await showChatView({ animate: true });
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  setText(keyStatus, "");
  applyTheme(settings.theme);
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
  const theme = applyTheme(themeSelect.value);
  const next = await updateSettings({ theme });
  syncSettingsSnapshot(next);
};
