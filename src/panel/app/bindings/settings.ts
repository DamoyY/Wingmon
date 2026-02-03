import { MdSwitch } from "@material/web/switch/switch.js";
import { updateSettings } from "../../services/settings.ts";
import { elements } from "../../ui/index.ts";
import {
  handleCancelSettings,
  handleLanguageChange,
  handleOpenSettings,
  handleSaveSettings,
  handleSettingsFieldChange,
  handleThemeChange,
  handleThemeColorChange,
  handleThemeVariantChange,
} from "../features/settings/index.ts";

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
    themeVariantSelect,
    languageSelect,
    followModeSwitch,
  } = elements;
  saveKey.addEventListener("click", () => {
    void handleSaveSettings();
  });
  cancelSettings.addEventListener("click", () => {
    void handleCancelSettings();
  });
  openSettings.addEventListener("click", () => {
    void handleOpenSettings();
  });
  keyInput.addEventListener("input", handleSettingsFieldChange);
  baseUrlInput.addEventListener("input", handleSettingsFieldChange);
  modelInput.addEventListener("input", handleSettingsFieldChange);
  apiTypeSelect.addEventListener("change", handleSettingsFieldChange);
  themeSelect.addEventListener("change", () => {
    void handleThemeChange();
  });
  themeColorInput.addEventListener("change", () => {
    void handleThemeColorChange();
  });
  themeVariantSelect.addEventListener("change", () => {
    void handleThemeVariantChange();
  });
  languageSelect.addEventListener("change", () => {
    void handleLanguageChange();
  });
  followModeSwitch.addEventListener("change", () => {
    void updateSettings({
      followMode: (followModeSwitch as MdSwitch).selected,
    });
  });
};

export default bindSettingsEvents;
