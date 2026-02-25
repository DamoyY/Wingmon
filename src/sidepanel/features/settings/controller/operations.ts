import {
  codexBackendBaseUrl,
  getSettings,
  getSettingsByApiType,
  normalizeApiType,
  startCodexLogin,
  updateSettings,
} from "../../../../shared/index.ts";
import { t } from "../../../lib/utils/index.ts";
import { type SettingsInput, validateRequiredSettings } from "../model.ts";
import {
  cacheApiTypeSettingsDraft,
  resolveActiveFormApiType,
  resolveCachedApiTypeSettingsDraft,
} from "./apiTypeDraftMemory.ts";
import {
  publishFormFilled,
  publishFormPatch,
  publishLocale,
  publishSaveButtonVisibility,
  publishSettingsStatus,
  publishTheme,
  publishViewSwitch,
} from "./effectsState.ts";
import {
  buildThemePayloadResult,
  createFailureFromError,
  createFailureResult,
  createFailureWithStatus,
  createSettingsResult,
  createSuccessResult,
  followModeErrorContext,
  languageErrorContext,
  readSettingsAndSync,
  resolveLocale,
  resolveSaveButtonVisible,
  resolveShouldShowChatView,
  settingsActionErrorContext,
  settingsReadErrorContext,
  syncSettingsSnapshot,
  toApiTypeSettingsDraft,
  toThemePayload,
  updateSettingsAndSync,
} from "./logic.ts";
import type {
  CancelSettingsPayload,
  LanguagePayload,
  SaveButtonStatePayload,
  SettingsControllerResult,
  SettingsPayload,
} from "./types.ts";

export { syncSettingsSnapshot };

export const handleSettingsFieldChange = (
  formValues: SettingsInput,
): SaveButtonStatePayload =>
  publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));

export const handleFollowModeChange = async ({
  followMode,
}: {
  followMode: boolean;
}): Promise<SettingsControllerResult<SettingsPayload>> => {
  try {
    return createSettingsResult(await updateSettings({ followMode }));
  } catch (error) {
    return createFailureFromError(error, followModeErrorContext);
  }
};

export const handleSaveSettings = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  const required = validateRequiredSettings(formValues);
  if (!required.valid) {
    console.error("设置保存校验失败", {
      formValues,
      message: required.message,
    });
    publishSettingsStatus(required.message);
    return createFailureResult(required.message);
  }

  const themePayloadResult = buildThemePayloadResult(formValues);
  if (!themePayloadResult.success) {
    publishSettingsStatus(themePayloadResult.message);
    return themePayloadResult;
  }

  const language = formValues.language?.trim();
  if (!language) {
    const validationMessage = t("settingsValidationLanguageRequired");
    console.error("设置保存校验失败", {
      formValues,
      message: validationMessage,
    });
    publishSettingsStatus(validationMessage);
    return createFailureResult(validationMessage);
  }

  try {
    const result = await updateSettingsAndSync({
      ...required.payload,
      ...themePayloadResult.payload,
      language,
    });
    if (!result.success) {
      publishSettingsStatus(result.message);
      return result;
    }
    publishSettingsStatus("");
    publishFormPatch({
      themeColor: result.payload.settings.themeColor,
      themeVariant: result.payload.settings.themeVariant,
    });
    publishTheme(toThemePayload(result.payload.settings));
    publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));
    publishViewSwitch({ animate: true, isFirstUse: false, target: "chat" });
    return result;
  } catch (error) {
    return createFailureWithStatus(error, settingsActionErrorContext);
  }
};

export const handleCancelSettings = async (): Promise<
  SettingsControllerResult<CancelSettingsPayload>
> => {
  try {
    const settings = await readSettingsAndSync();
    const locale = resolveLocale(settings.language);
    const shouldShowChatView = resolveShouldShowChatView(settings);
    publishFormFilled(settings);
    publishSettingsStatus("");
    publishTheme(toThemePayload(settings));
    publishLocale(locale);
    publishSaveButtonVisibility(resolveSaveButtonVisible(settings));
    if (shouldShowChatView) {
      publishViewSwitch({ animate: true, isFirstUse: false, target: "chat" });
    }
    return createSuccessResult({ locale, settings, shouldShowChatView });
  } catch (error) {
    return createFailureWithStatus(error, settingsReadErrorContext);
  }
};

export const handleOpenSettings = async (): Promise<
  SettingsControllerResult<SettingsPayload>
> => {
  try {
    const settings = await readSettingsAndSync();
    publishViewSwitch({ animate: true, isFirstUse: false, target: "key" });
    publishFormFilled(settings);
    publishSaveButtonVisibility(resolveSaveButtonVisible(settings));
    publishSettingsStatus("");
    return createSettingsResult(settings);
  } catch (error) {
    return createFailureWithStatus(error, settingsReadErrorContext);
  }
};

export const handleThemeSettingsChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  const themePayloadResult = buildThemePayloadResult(formValues);
  if (!themePayloadResult.success) {
    publishSettingsStatus(themePayloadResult.message);
    return themePayloadResult;
  }

  try {
    const currentSettings = await getSettings();
    publishSettingsStatus("");
    publishTheme(themePayloadResult.payload);
    publishFormPatch({
      themeColor: themePayloadResult.payload.themeColor,
      themeVariant: themePayloadResult.payload.themeVariant,
    });
    publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));
    return createSettingsResult({
      ...currentSettings,
      ...themePayloadResult.payload,
    });
  } catch (error) {
    return createFailureWithStatus(error, settingsActionErrorContext);
  }
};

export const handleApiTypeSelectionChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  try {
    const nextApiType = normalizeApiType(formValues.apiType);
    const currentApiType = resolveActiveFormApiType() ?? nextApiType;
    cacheApiTypeSettingsDraft(
      currentApiType,
      toApiTypeSettingsDraft(formValues),
    );
    const settings = await getSettingsByApiType(nextApiType);
    const cachedDraft = resolveCachedApiTypeSettingsDraft(nextApiType);
    const nextDraft = cachedDraft ?? toApiTypeSettingsDraft(settings);
    cacheApiTypeSettingsDraft(nextApiType, nextDraft);
    const nextFormValues: SettingsInput = {
      ...formValues,
      ...nextDraft,
      apiType: nextApiType,
    };
    publishSettingsStatus("");
    publishFormPatch({
      ...nextDraft,
    });
    publishSaveButtonVisibility(resolveSaveButtonVisible(nextFormValues));
    return createSettingsResult({
      ...settings,
      ...nextDraft,
      apiType: nextApiType,
    });
  } catch (error) {
    return createFailureWithStatus(error, settingsActionErrorContext);
  }
};

export const handleCodexLogin = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  publishSettingsStatus(t("settingsStatusCodexOpeningLogin"));
  try {
    const loginResult = await startCodexLogin();
    const result = await updateSettingsAndSync({
      apiKey: loginResult.accessToken,
      apiType: "codex",
      baseUrl: codexBackendBaseUrl,
    });
    if (!result.success) {
      publishSettingsStatus(result.message);
      return result;
    }
    const nextSettings = result.payload.settings;
    publishFormPatch({
      apiKey: nextSettings.apiKey,
      apiType: nextSettings.apiType,
      baseUrl: nextSettings.baseUrl,
    });
    const identity = loginResult.profile.email.trim();
    const loginSuccessMessage = identity
      ? t("settingsStatusCodexLoginSuccessWithIdentity", [identity])
      : t("settingsStatusCodexLoginSuccess");
    publishSettingsStatus(loginSuccessMessage);
    publishSaveButtonVisibility(
      resolveSaveButtonVisible({
        ...formValues,
        apiKey: nextSettings.apiKey,
        apiType: nextSettings.apiType,
        baseUrl: nextSettings.baseUrl,
      }),
    );
    return result;
  } catch (error) {
    return createFailureWithStatus(error, {
      fallbackMessage: t("settingsErrorCodexLoginFailed"),
      logLabel: "登录 ChatGPT 账号失败",
    });
  }
};

export const handleLanguageChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<LanguagePayload>> => {
  const language = formValues.language?.trim();
  if (!language) {
    const validationMessage = t("settingsValidationLanguageRequired");
    console.error("语言设置校验失败", { formValues });
    publishSettingsStatus(validationMessage);
    return createFailureResult(validationMessage);
  }

  try {
    const settings = await getSettings();
    const locale = resolveLocale(language);
    publishSettingsStatus("");
    publishLocale(locale);
    publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));
    return createSuccessResult({
      locale,
      settings: {
        ...settings,
        language,
      },
    });
  } catch (error) {
    return createFailureWithStatus(error, languageErrorContext);
  }
};
