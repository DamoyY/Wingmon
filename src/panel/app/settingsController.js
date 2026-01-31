import {
  applyTheme,
  fillSettingsForm,
  readSettingsFormValues,
  showChatView,
  showKeyView,
  updateSettingsFormValues,
  clearSettingsStatus,
  setSaveButtonVisible,
  setSettingsStatus,
} from "../ui/index.js";
import { setLocale, translateDOM } from "../utils/index.js";
import { getSettings, updateSettings } from "../services/index.js";
import {
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
  validateRequiredSettings,
} from "./settingsModel.js";

const updateSaveButtonVisibility = () => {
  const formValues = readSettingsFormValues();
  setSaveButtonVisible(
    isSettingsDirty(formValues) && isSettingsComplete(formValues),
  );
};

export const syncSettingsSnapshot = (settings) => {
  syncSettingsSnapshotState(settings);
  updateSaveButtonVisibility();
};

export const handleSettingsFieldChange = () => {
  updateSaveButtonVisibility();
};

export const handleSaveSettings = async () => {
  const formValues = readSettingsFormValues();
  const required = validateRequiredSettings(formValues);
  if (!required.valid) {
    setSettingsStatus(required.message);
    return;
  }
  let themePayload = null;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    setSettingsStatus(error.message);
    return;
  }
  const next = await updateSettings({
    ...required.payload,
    ...themePayload,
  });
  updateSettingsFormValues({ themeColor: next.themeColor });
  applyTheme(next.theme, next.themeColor);
  syncSettingsSnapshot(next);
  await showChatView({ animate: true });
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  clearSettingsStatus();
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
  clearSettingsStatus();
  const formValues = readSettingsFormValues();
  let themePayload = null;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    setSettingsStatus(error.message);
    return;
  }
  const theme = applyTheme(themePayload.theme, themePayload.themeColor);
  const next = await updateSettings({
    theme,
    themeColor: themePayload.themeColor,
  });
  updateSettingsFormValues({ themeColor: next.themeColor });
  syncSettingsSnapshot(next);
};

export const handleThemeColorChange = async () => {
  clearSettingsStatus();
  const formValues = readSettingsFormValues();
  let themePayload = null;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    setSettingsStatus(error.message);
    return;
  }
  const theme = applyTheme(themePayload.theme, themePayload.themeColor);
  const next = await updateSettings({
    theme,
    themeColor: themePayload.themeColor,
  });
  updateSettingsFormValues({ themeColor: next.themeColor });
  syncSettingsSnapshot(next);
};

export const handleLanguageChange = async () => {
  clearSettingsStatus();
  const { language } = readSettingsFormValues();
  await setLocale(language);
  translateDOM();
  const next = await updateSettings({ language });
  syncSettingsSnapshot(next);
};
