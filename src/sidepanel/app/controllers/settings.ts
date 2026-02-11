import {
  applyTheme,
  clearSettingsStatus,
  elements,
  fillSettingsForm,
  readSettingsFormValues,
  setSaveButtonVisible,
  setSettingsStatus,
  showChatView,
  showKeyView,
  updateSettingsFormValues,
} from "../../ui/index.ts";
import {
  handleCancelSettings,
  handleFollowModeChange,
  handleLanguageChange,
  handleOpenSettings,
  handleSaveSettings,
  handleSettingsFieldChange,
  handleThemeSettingsChange,
} from "../../features/settings/index.ts";
import { setLocale, translateDOM } from "../../lib/utils/index.ts";

const syncSaveButtonVisibility = (): void => {
  const result = handleSettingsFieldChange(readSettingsFormValues());
  setSaveButtonVisible(result.saveButtonVisible);
};

const applyControllerMessage = (message: string): void => {
  setSettingsStatus(message);
};

const handleSaveSettingsClick = async (): Promise<void> => {
  const result = await handleSaveSettings(readSettingsFormValues());
  if (!result.success) {
    applyControllerMessage(result.message);
    return;
  }
  clearSettingsStatus();
  const { settings } = result.payload;
  updateSettingsFormValues({
    themeColor: settings.themeColor,
    themeVariant: settings.themeVariant,
  });
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);
  syncSaveButtonVisibility();
  await showChatView({ animate: true });
};

const handleCancelSettingsClick = async (): Promise<void> => {
  const result = await handleCancelSettings();
  if (!result.success) {
    applyControllerMessage(result.message);
    return;
  }
  const { settings, locale, shouldShowChatView } = result.payload;
  fillSettingsForm(settings);
  clearSettingsStatus();
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);
  await setLocale(locale);
  translateDOM();
  syncSaveButtonVisibility();
  if (shouldShowChatView) {
    await showChatView({ animate: true });
  }
};

const handleOpenSettingsClick = async (): Promise<void> => {
  const result = await handleOpenSettings();
  if (!result.success) {
    applyControllerMessage(result.message);
    return;
  }
  await showKeyView({ animate: true, isFirstUse: false });
  fillSettingsForm(result.payload.settings);
  syncSaveButtonVisibility();
};

const handleThemeSettingsChangeClick = async (): Promise<void> => {
  clearSettingsStatus();
  const result = await handleThemeSettingsChange(readSettingsFormValues());
  if (!result.success) {
    applyControllerMessage(result.message);
    return;
  }
  const { settings } = result.payload;
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);
  updateSettingsFormValues({
    themeColor: settings.themeColor,
    themeVariant: settings.themeVariant,
  });
  syncSaveButtonVisibility();
};

const handleLanguageChangeClick = async (): Promise<void> => {
  clearSettingsStatus();
  const result = await handleLanguageChange(readSettingsFormValues());
  if (!result.success) {
    applyControllerMessage(result.message);
    return;
  }
  await setLocale(result.payload.locale);
  translateDOM();
  syncSaveButtonVisibility();
};

const handleFollowModeChangeClick = async (
  followMode: boolean,
): Promise<void> => {
  const result = await handleFollowModeChange({ followMode });
  if (!result.success) {
    console.error(result.message);
  }
};

const bindSettingsEvents = () => {
  const {
    saveKey,
    cancelSettings,
    openSettings,
    keyInput,
    baseUrlInput,
    modelInput,
    requestBodyOverridesInput,
    apiTypeSelect,
    themeSelect,
    themeColorInput,
    themeVariantSelect,
    languageSelect,
    followModeSwitch,
  } = elements;
  saveKey.addEventListener("click", () => {
    void handleSaveSettingsClick();
  });
  cancelSettings.addEventListener("click", () => {
    void handleCancelSettingsClick();
  });
  openSettings.addEventListener("click", () => {
    void handleOpenSettingsClick();
  });
  keyInput.addEventListener("input", syncSaveButtonVisibility);
  baseUrlInput.addEventListener("input", syncSaveButtonVisibility);
  modelInput.addEventListener("input", syncSaveButtonVisibility);
  requestBodyOverridesInput.addEventListener("input", syncSaveButtonVisibility);
  apiTypeSelect.addEventListener("change", syncSaveButtonVisibility);
  themeSelect.addEventListener("change", () => {
    void handleThemeSettingsChangeClick();
  });
  themeColorInput.addEventListener("change", () => {
    void handleThemeSettingsChangeClick();
  });
  themeVariantSelect.addEventListener("change", () => {
    void handleThemeSettingsChangeClick();
  });
  languageSelect.addEventListener("change", () => {
    void handleLanguageChangeClick();
  });
  followModeSwitch.addEventListener("change", () => {
    void handleFollowModeChangeClick(followModeSwitch.selected);
  });
  syncSaveButtonVisibility();
};

export default bindSettingsEvents;
