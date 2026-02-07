import {
  type Settings,
  getSettings,
  updateSettings,
} from "../../core/services/settingsStorage.ts";
import {
  type SettingsInput,
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
  validateRequiredSettings,
} from "./model.ts";
import { extractErrorMessage } from "../../../shared/index.ts";

type SettingsControllerFailure = {
  success: false;
  message: string;
};

type SettingsControllerSuccess<TPayload> = {
  success: true;
  payload: TPayload;
};

export type SettingsControllerResult<TPayload> =
  | SettingsControllerSuccess<TPayload>
  | SettingsControllerFailure;

type SaveButtonStatePayload = {
  saveButtonVisible: boolean;
};

type SettingsPayload = {
  settings: Settings;
};

type CancelSettingsPayload = {
  settings: Settings;
  shouldShowChatView: boolean;
  locale: string;
};

type LanguagePayload = {
  settings: Settings;
  locale: string;
};

type ErrorContext = {
  fallbackMessage: string;
  logLabel: string;
};

type ThemePayload = Pick<Settings, "theme" | "themeColor" | "themeVariant">;

const defaultLocale = "en",
  settingsActionErrorContext: ErrorContext = {
    fallbackMessage: "操作失败，请稍后重试",
    logLabel: "设置操作失败",
  },
  settingsReadErrorContext: ErrorContext = {
    fallbackMessage: "设置读取失败，请稍后重试",
    logLabel: "读取设置失败",
  },
  followModeErrorContext: ErrorContext = {
    fallbackMessage: "更新跟随模式失败",
    logLabel: "更新跟随模式失败",
  },
  languageErrorContext: ErrorContext = {
    fallbackMessage: "语言设置失败，请稍后重试",
    logLabel: "更新语言失败",
  },
  resolveErrorMessage = (error: unknown, context: ErrorContext): string => {
    console.error(context.logLabel, error);
    return extractErrorMessage(error, { fallback: context.fallbackMessage });
  },
  resolveSaveButtonVisible = (formValues: SettingsInput): boolean =>
    isSettingsDirty(formValues) && isSettingsComplete(formValues),
  createFailureResult = (message: string): SettingsControllerFailure => ({
    success: false,
    message,
  }),
  createSuccessResult = <TPayload>(
    payload: TPayload,
  ): SettingsControllerResult<TPayload> => ({
    success: true,
    payload,
  }),
  createSettingsResult = (
    settings: Settings,
  ): SettingsControllerResult<SettingsPayload> =>
    createSuccessResult({ settings }),
  createFailureFromError = (
    error: unknown,
    context: ErrorContext,
  ): SettingsControllerFailure =>
    createFailureResult(resolveErrorMessage(error, context)),
  resolveShouldShowChatView = (settings: Settings): boolean =>
    Boolean(settings.apiKey && settings.baseUrl && settings.model),
  resolveLocale = (language: string): string => language || defaultLocale,
  buildThemePayloadResult = (
    formValues: SettingsInput,
  ): SettingsControllerResult<ThemePayload> => {
    try {
      return createSuccessResult(buildThemePayload(formValues));
    } catch (error) {
      return createFailureFromError(error, settingsActionErrorContext);
    }
  },
  readSettingsAndSync = async (): Promise<Settings> => {
    const settings = await getSettings();
    syncSettingsSnapshot(settings);
    return settings;
  },
  updateSettingsAndSync = async (
    patch: Partial<Settings>,
  ): Promise<SettingsControllerResult<SettingsPayload>> => {
    const settings = await updateSettings(patch);
    syncSettingsSnapshot(settings);
    return createSettingsResult(settings);
  };

export const syncSettingsSnapshot = (settings: SettingsInput): void => {
  syncSettingsSnapshotState(settings);
};

export const handleSettingsFieldChange = (
  formValues: SettingsInput,
): SaveButtonStatePayload => ({
  saveButtonVisible: resolveSaveButtonVisible(formValues),
});

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
    return createFailureResult(required.message);
  }

  const themePayloadResult = buildThemePayloadResult(formValues);
  if (!themePayloadResult.success) {
    return themePayloadResult;
  }

  try {
    return await updateSettingsAndSync({
      ...required.payload,
      ...themePayloadResult.payload,
    });
  } catch (error) {
    return createFailureFromError(error, settingsActionErrorContext);
  }
};

export const handleCancelSettings = async (): Promise<
  SettingsControllerResult<CancelSettingsPayload>
> => {
  try {
    const settings = await readSettingsAndSync();
    return createSuccessResult({
      settings,
      shouldShowChatView: resolveShouldShowChatView(settings),
      locale: resolveLocale(settings.language),
    });
  } catch (error) {
    return createFailureFromError(error, settingsReadErrorContext);
  }
};

export const handleOpenSettings = async (): Promise<
  SettingsControllerResult<SettingsPayload>
> => {
  try {
    const settings = await readSettingsAndSync();
    return createSettingsResult(settings);
  } catch (error) {
    return createFailureFromError(error, settingsReadErrorContext);
  }
};

export const handleThemeSettingsChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  const themePayloadResult = buildThemePayloadResult(formValues);
  if (!themePayloadResult.success) {
    return themePayloadResult;
  }

  try {
    return await updateSettingsAndSync(themePayloadResult.payload);
  } catch (error) {
    return createFailureFromError(error, settingsActionErrorContext);
  }
};

export const handleLanguageChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<LanguagePayload>> => {
  const language = formValues.language?.trim();
  if (!language) {
    console.error("语言设置校验失败", { formValues });
    return createFailureResult("语言不能为空");
  }

  try {
    const settings = await updateSettings({ language });
    syncSettingsSnapshot(settings);
    return createSuccessResult({
      settings,
      locale: resolveLocale(settings.language),
    });
  } catch (error) {
    return createFailureFromError(error, languageErrorContext);
  }
};
