import type { Settings } from "../../../../shared/index.ts";

export type SettingsControllerFailure = { success: false; message: string };

export type SettingsControllerSuccess<TPayload> = {
  success: true;
  payload: TPayload;
};

export type SettingsControllerResult<TPayload> =
  | SettingsControllerSuccess<TPayload>
  | SettingsControllerFailure;

export type SaveButtonStatePayload = { saveButtonVisible: boolean };

export type SettingsPayload = { settings: Settings };

export type CancelSettingsPayload = {
  settings: Settings;
  shouldShowChatView: boolean;
  locale: string;
};

export type LanguagePayload = { settings: Settings; locale: string };

export type ErrorContext = { fallbackMessage: string; logLabel: string };

export type ThemePayload = Pick<
  Settings,
  "theme" | "themeColor" | "themeVariant"
>;

export type ApiTypeSettingsDraft = Pick<
  Settings,
  "apiKey" | "baseUrl" | "model" | "requestBodyOverrides"
>;

export type SettingsFormPatch = Partial<
  Pick<
    Settings,
    | "apiKey"
    | "apiType"
    | "baseUrl"
    | "model"
    | "requestBodyOverrides"
    | "themeColor"
    | "themeVariant"
  >
>;

export type ViewTarget = "chat" | "key";

export type SettingsControllerEffect =
  | { type: "saveButtonVisibilityChanged"; visible: boolean }
  | { type: "settingsStatusChanged"; message: string }
  | { type: "settingsFormFilled"; settings: Settings }
  | { type: "settingsFormPatched"; values: SettingsFormPatch }
  | { type: "themeChanged"; theme: ThemePayload }
  | { type: "localeChanged"; locale: string }
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

export type SettingsControllerStateListener = (
  state: SettingsControllerState,
) => void;
