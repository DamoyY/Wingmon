import { updateSettings } from "../../services/index.js";
import { elements } from "../../ui/index.js";
import {
  handleCancelSettings,
  handleLanguageChange,
  handleOpenSettings,
  handleSaveSettings,
  handleSettingsFieldChange,
  handleThemeChange,
  handleThemeColorChange,
} from "../features/settings/index.js";

const bindSettingsEvents = () => {
  const {
    saveKey,
    cancelSettings,
    openSettings,
    keyInput,
    baseUrlInput,
    modelInput,
    apiTypeSelect,
    themeSelect,
    themeColorInput,
    languageSelect,
    followModeSwitch,
  } = elements;
  saveKey.addEventListener("click", handleSaveSettings);
  cancelSettings.addEventListener("click", handleCancelSettings);
  openSettings.addEventListener("click", handleOpenSettings);
  keyInput.addEventListener("input", handleSettingsFieldChange);
  baseUrlInput.addEventListener("input", handleSettingsFieldChange);
  modelInput.addEventListener("input", handleSettingsFieldChange);
  apiTypeSelect.addEventListener("change", handleSettingsFieldChange);
  themeSelect.addEventListener("change", handleThemeChange);
  themeColorInput.addEventListener("change", handleThemeColorChange);
  languageSelect.addEventListener("change", handleLanguageChange);
  followModeSwitch.addEventListener("change", async () => {
    await updateSettings({ followMode: Boolean(followModeSwitch.selected) });
  });
};

export default bindSettingsEvents;
