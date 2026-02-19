import {
  type SettingsControllerEffect,
  handleCancelSettings,
  handleCodexLogin,
  handleFollowModeChange,
  handleLanguageChange,
  handleOpenSettings,
  handleSaveSettings,
  handleSettingsFieldChange,
  handleThemeSettingsChange,
  subscribeSettingsControllerState,
} from "../../features/settings/index.ts";
import {
  applyTheme,
  elements,
  fillSettingsForm,
  readSettingsFormValues,
  setCodexAuthModeVisible,
  setCodexAuthStatus,
  setCodexLoginButtonBusy,
  setCodexLoginButtonText,
  setSaveButtonVisible,
  setSettingsStatus,
  showChatView,
  showKeyView,
  updateSettingsFormValues,
} from "../../ui/index.ts";
import { codexBackendBaseUrl, isCodexApiType } from "../../../shared/index.ts";
import { setLocale, t, translateDOM } from "../../lib/utils/index.ts";

let unsubscribeSettingsControllerState: (() => void) | null = null;
let lastHandledEffectVersion = 0;
let settingsEffectQueue: Promise<void> = Promise.resolve();

type CodexAuthUiState = {
  loggedIn: boolean;
  statusText: string;
};

const syncSaveButtonVisibility = (): void => {
  handleSettingsFieldChange(readSettingsFormValues());
};

const resolveCodexAuthState = (
  formValues: ReturnType<typeof readSettingsFormValues>,
): CodexAuthUiState => {
  if (!isCodexApiType(formValues.apiType)) {
    return { loggedIn: false, statusText: "" };
  }
  const normalizedBaseUrl = formValues.baseUrl.trim().replace(/\/+$/u, "");
  if (
    !formValues.apiKey.trim() ||
    normalizedBaseUrl !== codexBackendBaseUrl.replace(/\/+$/u, "")
  ) {
    return {
      loggedIn: false,
      statusText: t("codexAuthStatusNotLoggedIn"),
    };
  }
  return {
    loggedIn: true,
    statusText: t("codexAuthStatusLoggedIn"),
  };
};

const syncCodexAuthUi = (): void => {
  const formValues = readSettingsFormValues();
  const authState = resolveCodexAuthState(formValues);
  const visible = isCodexApiType(formValues.apiType);
  setCodexAuthModeVisible(visible);
  setCodexAuthStatus(authState.statusText);
  setCodexLoginButtonText(
    authState.loggedIn ? t("codexSwitchAction") : t("codexLoginAction"),
  );
};

const applySettingsEffect = async (
  effect: SettingsControllerEffect,
): Promise<void> => {
  switch (effect.type) {
    case "saveButtonVisibilityChanged":
      setSaveButtonVisible(effect.visible);
      return;
    case "settingsStatusChanged":
      setSettingsStatus(effect.message);
      return;
    case "settingsFormFilled":
      fillSettingsForm(effect.settings);
      syncCodexAuthUi();
      return;
    case "settingsFormPatched":
      updateSettingsFormValues(effect.values);
      syncCodexAuthUi();
      return;
    case "themeChanged":
      applyTheme(
        effect.theme.theme,
        effect.theme.themeColor,
        effect.theme.themeVariant,
      );
      return;
    case "localeChanged":
      await setLocale(effect.locale);
      translateDOM();
      syncCodexAuthUi();
      return;
    case "viewSwitchRequested":
      if (effect.target === "chat") {
        await showChatView({ animate: effect.animate });
        return;
      }
      await showKeyView({
        animate: effect.animate,
        isFirstUse: effect.isFirstUse,
      });
      return;
    default:
      throw new Error("未知的设置控制器状态变更类型");
  }
};

const enqueueSettingsEffect = (effect: SettingsControllerEffect): void => {
  settingsEffectQueue = settingsEffectQueue
    .then(async () => {
      await applySettingsEffect(effect);
    })
    .catch((error: unknown) => {
      console.error("处理设置控制器状态变更失败", error);
    });
};

const ensureSettingsControllerStateSubscription = (): void => {
  if (unsubscribeSettingsControllerState) {
    return;
  }
  unsubscribeSettingsControllerState = subscribeSettingsControllerState(
    (controllerState) => {
      if (controllerState.effectVersion <= lastHandledEffectVersion) {
        return;
      }
      lastHandledEffectVersion = controllerState.effectVersion;
      const { lastEffect } = controllerState;
      if (!lastEffect) {
        return;
      }
      enqueueSettingsEffect(lastEffect);
    },
  );
};

const handleSaveSettingsClick = async (): Promise<void> => {
  await handleSaveSettings(readSettingsFormValues());
};

const handleCancelSettingsClick = async (): Promise<void> => {
  await handleCancelSettings();
};

const handleOpenSettingsClick = async (): Promise<void> => {
  await handleOpenSettings();
};

const handleThemeSettingsChangeClick = async (): Promise<void> => {
  await handleThemeSettingsChange(readSettingsFormValues());
};

const handleLanguageChangeClick = async (): Promise<void> => {
  await handleLanguageChange(readSettingsFormValues());
};

const handleCodexLoginClick = async (): Promise<void> => {
  setCodexLoginButtonBusy(true);
  try {
    const result = await handleCodexLogin(readSettingsFormValues());
    if (!result.success) {
      console.error(result.message);
    }
  } finally {
    setCodexLoginButtonBusy(false);
    syncCodexAuthUi();
  }
};

const handleFollowModeChangeClick = async (
  followMode: boolean,
): Promise<void> => {
  const result = await handleFollowModeChange({ followMode });
  if (!result.success) {
    console.error(result.message);
  }
};

const handleApiTypeChange = (): void => {
  syncCodexAuthUi();
  syncSaveButtonVisibility();
};

const bindSettingsEvents = () => {
  ensureSettingsControllerStateSubscription();
  const {
    saveKey,
    cancelSettings,
    openSettings,
    keyInput,
    baseUrlInput,
    codexLoginButton,
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
  apiTypeSelect.addEventListener("change", handleApiTypeChange);
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
  codexLoginButton.addEventListener("click", () => {
    void handleCodexLoginClick();
  });
  syncCodexAuthUi();
  syncSaveButtonVisibility();
};

export default bindSettingsEvents;
