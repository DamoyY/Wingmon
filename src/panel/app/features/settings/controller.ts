import {
  getSettings,
  updateSettings,
  type Settings,
} from "../../../services/settingsStorage.ts";
import {
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
  type SettingsInput,
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

type ErrorLike =
  | Error
  | {
      message?: string;
    }
  | string
  | null
  | undefined;

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

const resolveErrorMessage = (
    error: ErrorLike,
    fallback: string,
    label: string,
  ): string => {
    console.error(label, error);
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string" && error.trim()) {
      return error;
    }
    if (
      error &&
      typeof error === "object" &&
      typeof error.message === "string" &&
      error.message.trim()
    ) {
      return error.message;
    }
    return fallback;
  },
  resolveSaveButtonVisible = (formValues: SettingsInput): boolean =>
    isSettingsDirty(formValues) && isSettingsComplete(formValues),
  createFailureResult = (message: string): SettingsControllerFailure => ({
    success: false,
    message,
  }),
  createSettingsResult = (
    settings: Settings,
  ): SettingsControllerResult<SettingsPayload> => ({
    success: true,
    payload: { settings },
  }),
  resolveShouldShowChatView = (settings: Settings): boolean =>
    Boolean(settings.apiKey && settings.baseUrl && settings.model);

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
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "更新跟随模式失败",
        "更新跟随模式失败",
      ),
    );
  }
};

export const handleSaveSettings = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  const required = validateRequiredSettings(formValues);
  if (!required.valid) {
    return createFailureResult(required.message);
  }
  let themePayload: ReturnType<typeof buildThemePayload>;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "操作失败，请稍后重试",
        "设置操作失败",
      ),
    );
  }
  try {
    const settings = await updateSettings({
      ...required.payload,
      ...themePayload,
    });
    syncSettingsSnapshot(settings);
    return createSettingsResult(settings);
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "操作失败，请稍后重试",
        "设置操作失败",
      ),
    );
  }
};

export const handleCancelSettings = async (): Promise<
  SettingsControllerResult<CancelSettingsPayload>
> => {
  try {
    const settings = await getSettings();
    syncSettingsSnapshot(settings);
    return {
      success: true,
      payload: {
        settings,
        shouldShowChatView: resolveShouldShowChatView(settings),
        locale: settings.language || "en",
      },
    };
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "设置读取失败，请稍后重试",
        "读取设置失败",
      ),
    );
  }
};

export const handleOpenSettings = async (): Promise<
  SettingsControllerResult<SettingsPayload>
> => {
  try {
    const settings = await getSettings();
    syncSettingsSnapshot(settings);
    return createSettingsResult(settings);
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "设置读取失败，请稍后重试",
        "读取设置失败",
      ),
    );
  }
};

const handleThemeUpdate = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  let themePayload: ReturnType<typeof buildThemePayload>;
  try {
    themePayload = buildThemePayload(formValues);
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "操作失败，请稍后重试",
        "设置操作失败",
      ),
    );
  }
  try {
    const settings = await updateSettings({
      theme: themePayload.theme,
      themeColor: themePayload.themeColor,
      themeVariant: themePayload.themeVariant,
    });
    syncSettingsSnapshot(settings);
    return createSettingsResult(settings);
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "操作失败，请稍后重试",
        "设置操作失败",
      ),
    );
  }
};

export const handleThemeChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> =>
  handleThemeUpdate(formValues);

export const handleThemeColorChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> =>
  handleThemeUpdate(formValues);

export const handleThemeVariantChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<SettingsPayload>> =>
  handleThemeUpdate(formValues);

export const handleLanguageChange = async (
  formValues: SettingsInput,
): Promise<SettingsControllerResult<LanguagePayload>> => {
  const { language } = formValues;
  if (!language) {
    return createFailureResult("语言不能为空");
  }
  try {
    const settings = await updateSettings({ language });
    syncSettingsSnapshot(settings);
    return {
      success: true,
      payload: {
        settings,
        locale: settings.language || "en",
      },
    };
  } catch (error) {
    return createFailureResult(
      resolveErrorMessage(
        error as ErrorLike,
        "语言设置失败，请稍后重试",
        "更新语言失败",
      ),
    );
  }
};
