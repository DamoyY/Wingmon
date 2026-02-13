import {
  type Settings,
  extractErrorMessage,
  getSettings,
  updateSettings,
} from "../../../shared/index.ts";
import {
  type SettingsInput,
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
  validateRequiredSettings,
} from "./model.ts";

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
type SettingsFormPatch = Partial<Pick<Settings, "themeColor" | "themeVariant">>;
type ViewTarget = "chat" | "key";

export type SettingsControllerEffect =
  | {
      type: "saveButtonVisibilityChanged";
      visible: boolean;
    }
  | {
      type: "settingsStatusChanged";
      message: string;
    }
  | {
      type: "settingsFormFilled";
      settings: Settings;
    }
  | {
      type: "settingsFormPatched";
      values: SettingsFormPatch;
    }
  | {
      type: "themeChanged";
      theme: ThemePayload;
    }
  | {
      type: "localeChanged";
      locale: string;
    }
  | {
      type: "viewSwitchRequested";
      target: ViewTarget;
      animate: boolean;
      isFirstUse: boolean;
    };

export type SettingsControllerState = {
  effectVersion: number;
  lastEffect: SettingsControllerEffect | null;
};

type SettingsControllerStateListener = (state: SettingsControllerState) => void;

const defaultLocale = "en",
  settingsControllerState: SettingsControllerState = {
    effectVersion: 0,
    lastEffect: null,
  },
  settingsControllerStateListeners: Set<SettingsControllerStateListener> =
    new Set(),
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
  snapshotSettingsControllerState = (): SettingsControllerState => ({
    effectVersion: settingsControllerState.effectVersion,
    lastEffect: settingsControllerState.lastEffect,
  }),
  notifySettingsControllerStateChange = (): void => {
    const snapshot = snapshotSettingsControllerState();
    settingsControllerStateListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("设置控制器状态订阅回调执行失败", error);
      }
    });
  },
  publishSettingsControllerEffect = (
    effect: SettingsControllerEffect,
  ): void => {
    settingsControllerState.lastEffect = effect;
    settingsControllerState.effectVersion += 1;
    notifySettingsControllerStateChange();
  },
  publishSettingsStatus = (message: string): void => {
    publishSettingsControllerEffect({
      message,
      type: "settingsStatusChanged",
    });
  },
  publishSaveButtonVisibility = (visible: boolean): SaveButtonStatePayload => {
    publishSettingsControllerEffect({
      type: "saveButtonVisibilityChanged",
      visible,
    });
    return { saveButtonVisible: visible };
  },
  publishFormFilled = (settings: Settings): void => {
    publishSettingsControllerEffect({
      settings,
      type: "settingsFormFilled",
    });
  },
  publishFormPatch = (values: SettingsFormPatch): void => {
    publishSettingsControllerEffect({
      type: "settingsFormPatched",
      values,
    });
  },
  publishTheme = (theme: ThemePayload): void => {
    publishSettingsControllerEffect({
      theme,
      type: "themeChanged",
    });
  },
  publishLocale = (locale: string): void => {
    publishSettingsControllerEffect({
      locale,
      type: "localeChanged",
    });
  },
  publishViewSwitch = ({
    animate,
    isFirstUse,
    target,
  }: {
    animate: boolean;
    isFirstUse: boolean;
    target: ViewTarget;
  }): void => {
    publishSettingsControllerEffect({
      animate,
      isFirstUse,
      target,
      type: "viewSwitchRequested",
    });
  },
  resolveSaveButtonVisible = (formValues: SettingsInput): boolean =>
    isSettingsDirty(formValues) && isSettingsComplete(formValues),
  createFailureResult = (message: string): SettingsControllerFailure => ({
    message,
    success: false,
  }),
  createSuccessResult = <TPayload>(
    payload: TPayload,
  ): SettingsControllerResult<TPayload> => ({
    payload,
    success: true,
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
  createFailureWithStatus = (
    error: unknown,
    context: ErrorContext,
  ): SettingsControllerFailure => {
    const failure = createFailureFromError(error, context);
    publishSettingsStatus(failure.message);
    return failure;
  },
  resolveShouldShowChatView = (settings: Settings): boolean =>
    Boolean(settings.apiKey && settings.baseUrl && settings.model),
  resolveLocale = (language: string): string => language || defaultLocale,
  toThemePayload = (settings: Settings): ThemePayload => ({
    theme: settings.theme,
    themeColor: settings.themeColor,
    themeVariant: settings.themeVariant,
  }),
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

export const getSettingsControllerState = (): SettingsControllerState =>
  snapshotSettingsControllerState();

export const subscribeSettingsControllerState = (
  listener: SettingsControllerStateListener,
): (() => void) => {
  if (typeof listener !== "function") {
    throw new Error("设置控制器订阅回调无效");
  }
  settingsControllerStateListeners.add(listener);
  return () => {
    settingsControllerStateListeners.delete(listener);
  };
};

export const syncSettingsSnapshot = (settings: SettingsInput): void => {
  syncSettingsSnapshotState(settings);
};

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

  try {
    const result = await updateSettingsAndSync({
      ...required.payload,
      ...themePayloadResult.payload,
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
    publishViewSwitch({
      animate: true,
      isFirstUse: false,
      target: "chat",
    });
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
      publishViewSwitch({
        animate: true,
        isFirstUse: false,
        target: "chat",
      });
    }
    return createSuccessResult({
      locale,
      settings,
      shouldShowChatView,
    });
  } catch (error) {
    return createFailureWithStatus(error, settingsReadErrorContext);
  }
};

export const handleOpenSettings = async (): Promise<
  SettingsControllerResult<SettingsPayload>
> => {
  try {
    const settings = await readSettingsAndSync();
    publishViewSwitch({
      animate: true,
      isFirstUse: false,
      target: "key",
    });
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
    const result = await updateSettingsAndSync(themePayloadResult.payload);
    if (!result.success) {
      publishSettingsStatus(result.message);
      return result;
    }
    publishSettingsStatus("");
    publishTheme(toThemePayload(result.payload.settings));
    publishFormPatch({
      themeColor: result.payload.settings.themeColor,
      themeVariant: result.payload.settings.themeVariant,
    });
    publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));
    return result;
  } catch (error) {
    return createFailureWithStatus(error, settingsActionErrorContext);
  }
};

export const handleLanguageChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<LanguagePayload>> => {
  const language = formValues.language?.trim();
  if (!language) {
    console.error("语言设置校验失败", { formValues });
    publishSettingsStatus("语言不能为空");
    return createFailureResult("语言不能为空");
  }

  try {
    const settings = await updateSettings({ language });
    syncSettingsSnapshot(settings);
    const locale = resolveLocale(settings.language);
    publishSettingsStatus("");
    publishLocale(locale);
    publishSaveButtonVisibility(resolveSaveButtonVisible(formValues));
    return createSuccessResult({
      locale,
      settings,
    });
  } catch (error) {
    return createFailureWithStatus(error, languageErrorContext);
  }
};
