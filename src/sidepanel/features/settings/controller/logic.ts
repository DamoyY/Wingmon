import {
  type Settings,
  extractErrorMessage,
  getSettings,
  normalizeApiType,
  updateSettings,
} from "../../../../shared/index.ts";
import {
  type SettingsInput,
  buildThemePayload,
  isSettingsComplete,
  isSettingsDirty,
  syncSettingsSnapshotState,
} from "../model.ts";
import {
  cacheApiTypeSettingsDraft,
  resetApiTypeSettingsDraftMemory,
} from "./apiTypeDraftMemory.ts";
import { publishSettingsStatus } from "./effectsState.ts";
import type {
  ApiTypeSettingsDraft,
  ErrorContext,
  SettingsControllerFailure,
  SettingsControllerResult,
  SettingsPayload,
  ThemePayload,
} from "./types.ts";

const defaultLocale = "en";

export const settingsActionErrorContext: ErrorContext = {
  fallbackMessage: "操作失败，请稍后重试",
  logLabel: "设置操作失败",
};

export const settingsReadErrorContext: ErrorContext = {
  fallbackMessage: "设置读取失败，请稍后重试",
  logLabel: "读取设置失败",
};

export const followModeErrorContext: ErrorContext = {
  fallbackMessage: "更新跟随模式失败",
  logLabel: "更新跟随模式失败",
};

export const languageErrorContext: ErrorContext = {
  fallbackMessage: "语言设置失败，请稍后重试",
  logLabel: "更新语言失败",
};

const resolveErrorMessage = (error: unknown, context: ErrorContext): string => {
  console.error(context.logLabel, error);
  return extractErrorMessage(error, { fallback: context.fallbackMessage });
};

export const resolveSaveButtonVisible = (formValues: SettingsInput): boolean =>
  isSettingsDirty(formValues) && isSettingsComplete(formValues);

export const createFailureResult = (
  message: string,
): SettingsControllerFailure => ({
  message,
  success: false,
});

export const createSuccessResult = <TPayload>(
  payload: TPayload,
): SettingsControllerResult<TPayload> => ({ payload, success: true });

export const createSettingsResult = (
  settings: Settings,
): SettingsControllerResult<SettingsPayload> =>
  createSuccessResult({ settings });

export const createFailureFromError = (
  error: unknown,
  context: ErrorContext,
): SettingsControllerFailure =>
  createFailureResult(resolveErrorMessage(error, context));

export const createFailureWithStatus = (
  error: unknown,
  context: ErrorContext,
): SettingsControllerFailure => {
  const failure = createFailureFromError(error, context);
  publishSettingsStatus(failure.message);
  return failure;
};

export const resolveShouldShowChatView = (settings: Settings): boolean =>
  isSettingsComplete(settings);

export const resolveLocale = (language: string): string =>
  language || defaultLocale;

export const toThemePayload = (settings: Settings): ThemePayload => ({
  theme: settings.theme,
  themeColor: settings.themeColor,
  themeVariant: settings.themeVariant,
});

export const toApiTypeSettingsDraft = (
  source: Pick<
    SettingsInput,
    "apiKey" | "baseUrl" | "model" | "requestBodyOverrides"
  >,
): ApiTypeSettingsDraft => ({
  apiKey: source.apiKey ?? "",
  baseUrl: source.baseUrl ?? "",
  model: source.model ?? "",
  requestBodyOverrides: source.requestBodyOverrides ?? "",
});

export const buildThemePayloadResult = (
  formValues: SettingsInput,
): SettingsControllerResult<ThemePayload> => {
  try {
    return createSuccessResult(buildThemePayload(formValues));
  } catch (error) {
    return createFailureFromError(error, settingsActionErrorContext);
  }
};

export const syncSettingsSnapshot = (settings: SettingsInput): void => {
  const normalized = syncSettingsSnapshotState(settings);
  const apiType = normalizeApiType(normalized.apiType);
  cacheApiTypeSettingsDraft(apiType, toApiTypeSettingsDraft(normalized));
};

export const readSettingsAndSync = async (): Promise<Settings> => {
  resetApiTypeSettingsDraftMemory();
  const settings = await getSettings();
  syncSettingsSnapshot(settings);
  return settings;
};

export const updateSettingsAndSync = async (
  patch: Partial<Settings>,
): Promise<SettingsControllerResult<SettingsPayload>> => {
  const settings = await updateSettings(patch);
  syncSettingsSnapshot(settings);
  return createSettingsResult(settings);
};
