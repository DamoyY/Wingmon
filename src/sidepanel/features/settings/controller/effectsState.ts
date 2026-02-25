import type { Settings } from "../../../../shared/index.ts";
import type {
  SaveButtonStatePayload,
  SettingsControllerEffect,
  SettingsControllerState,
  SettingsControllerStateListener,
  SettingsFormPatch,
  ThemePayload,
  ViewTarget,
} from "./types.ts";

const settingsControllerState: SettingsControllerState = {
  effectVersion: 0,
  lastEffect: null,
};

const settingsControllerStateListeners: Set<SettingsControllerStateListener> =
  new Set();

const snapshotSettingsControllerState = (): SettingsControllerState => ({
  effectVersion: settingsControllerState.effectVersion,
  lastEffect: settingsControllerState.lastEffect,
});

const notifySettingsControllerStateChange = (): void => {
  const snapshot = snapshotSettingsControllerState();
  settingsControllerStateListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("设置控制器状态订阅回调执行失败", error);
    }
  });
};

const publishSettingsControllerEffect = (
  effect: SettingsControllerEffect,
): void => {
  settingsControllerState.lastEffect = effect;
  settingsControllerState.effectVersion += 1;
  notifySettingsControllerStateChange();
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

export const publishSettingsStatus = (message: string): void => {
  publishSettingsControllerEffect({ message, type: "settingsStatusChanged" });
};

export const publishSaveButtonVisibility = (
  visible: boolean,
): SaveButtonStatePayload => {
  publishSettingsControllerEffect({
    type: "saveButtonVisibilityChanged",
    visible,
  });
  return { saveButtonVisible: visible };
};

export const publishFormFilled = (settings: Settings): void => {
  publishSettingsControllerEffect({ settings, type: "settingsFormFilled" });
};

export const publishFormPatch = (values: SettingsFormPatch): void => {
  publishSettingsControllerEffect({ type: "settingsFormPatched", values });
};

export const publishTheme = (theme: ThemePayload): void => {
  publishSettingsControllerEffect({ theme, type: "themeChanged" });
};

export const publishLocale = (locale: string): void => {
  publishSettingsControllerEffect({ locale, type: "localeChanged" });
};

export const publishViewSwitch = ({
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
};
