import {
  applyTheme,
  clearSettingsStatus,
  fillSettingsForm,
  readSettingsFormValues,
  setSaveButtonVisible,
  setSettingsStatus,
  showChatView,
  showKeyView,
  updateSettingsFormValues,
} from "../../../ui/index.ts";
import { setLocale, translateDOM } from "../../../utils/index.ts";
import {
  getSettings,
  updateSettings,
} from "../../../services/settingsStorage.ts";
import {
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
  validateRequiredSettings,
} from "./model.ts";

const updateSaveButtonVisibility = () => {
  const formValues = readSettingsFormValues();
  setSaveButtonVisible(
    isSettingsDirty(formValues) && isSettingsComplete(formValues),
  );
};

const getErrorMessage = (error: unknown): string => {
  console.error("设置操作失败", error);
  if (error instanceof Error) {
    return error.message;
  }
  return "操作失败，请稍后重试";
};

export const syncSettingsSnapshot = (settings: Record<string, unknown>) => {
  syncSettingsSnapshotState(settings);
  updateSaveButtonVisibility();
};

export const handleSettingsFieldChange = () => {
  updateSaveButtonVisibility();
};

export const handleFollowModeChange = async (
  followMode: boolean,
): Promise<void> => {
  try {
    await updateSettings({ followMode });
  } catch (error) {
    console.error("更新跟随模式失败", error);
  }
};

export const handleSaveSettings = async () => {
  const formValues = readSettingsFormValues(),
    required = validateRequiredSettings(formValues);
  if (!required.valid) {
    setSettingsStatus(required.message);
    return;
  }
  let themePayload: ReturnType<typeof buildThemePayload> | null = null;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    setSettingsStatus(getErrorMessage(error));
    return;
  }
  const next = await updateSettings({
    ...required.payload,
    ...themePayload,
  });
  updateSettingsFormValues({
    themeColor: next.themeColor,
    themeVariant: next.themeVariant,
  });
  applyTheme(next.theme, next.themeColor, next.themeVariant);
  syncSettingsSnapshot(next);
  await showChatView({ animate: true });
};

export const handleCancelSettings = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  clearSettingsStatus();
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);
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

const handleThemeUpdate = async () => {
  clearSettingsStatus();
  const formValues = readSettingsFormValues();
  try {
    const themePayload = buildThemePayload(formValues),
      theme = applyTheme(
        themePayload.theme,
        themePayload.themeColor,
        themePayload.themeVariant,
      ),
      next = await updateSettings({
        theme,
        themeColor: themePayload.themeColor,
        themeVariant: themePayload.themeVariant,
      });
    updateSettingsFormValues({
      themeColor: next.themeColor,
      themeVariant: next.themeVariant,
    });
    syncSettingsSnapshot(next);
  } catch (error) {
    setSettingsStatus(getErrorMessage(error));
    return;
  }
};

export const handleThemeChange = async () => handleThemeUpdate();

export const handleThemeColorChange = async () => handleThemeUpdate();

export const handleThemeVariantChange = async () => handleThemeUpdate();

export const handleLanguageChange = async () => {
  clearSettingsStatus();
  const { language } = readSettingsFormValues();
  await setLocale(language);
  translateDOM();
  const next = await updateSettings({ language });
  syncSettingsSnapshot(next);
};
