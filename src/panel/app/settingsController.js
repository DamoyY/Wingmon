import {
  apiTypeSelect,
  applyTheme,
  baseUrlInput,
  fillSettingsForm,
  keyInput,
  keyStatus,
  modelInput,
  setText,
  showChatView,
  showKeyView,
  themeSelect,
} from "../ui/index.js";
import { normalizeTheme } from "../utils/index.js";
import { getSettings, updateSettings } from "../services/index.js";

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
  showChatView();
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  setText(keyStatus, "");
  applyTheme(settings.theme);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  }
};

export const handleOpenSettings = async () => {
  const settings = await getSettings();
  showKeyView();
  fillSettingsForm(settings);
};

export const handleThemeChange = async () => {
  const theme = applyTheme(themeSelect.value);
  await updateSettings({ theme });
};
