import {
  type SettingsControllerEffect,
  handleApiTypeSelectionChange,
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
import { refreshSendWithPageButton } from "../../features/chat/messages/index.ts";

let unsubscribeSettingsControllerState: (() => void) | null = null;
let lastHandledEffectVersion = 0;
let settingsEffectQueue: Promise<void> = Promise.resolve();
const normalizedCodexBackendBaseUrl = codexBackendBaseUrl.replace(/\/+$/u, "");

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
    normalizedBaseUrl !== normalizedCodexBackendBaseUrl
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

const syncFormFilledEffect = async (
  settings: Parameters<typeof fillSettingsForm>[0],
): Promise<void> => {
  fillSettingsForm(settings);
  syncCodexAuthUi();
  await refreshSendWithPageButton();
};

const syncFormPatchedEffect = async (
  values: Parameters<typeof updateSettingsFormValues>[0],
): Promise<void> => {
  syncCodexAuthUi();
  updateSettingsFormValues(values);
  syncCodexAuthUi();
  await refreshSendWithPageButton();
};

const runAsyncTask = (task: () => Promise<void>): void => {
  void task();
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
      await syncFormFilledEffect(effect.settings);
      return;
    case "settingsFormPatched":
      await syncFormPatchedEffect(effect.values);
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

const handleApiTypeChange = async (): Promise<void> => {
  const result = await handleApiTypeSelectionChange(readSettingsFormValues());
  if (!result.success) {
    console.error(result.message);
    syncCodexAuthUi();
    syncSaveButtonVisibility();
  }
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
  const handleThemeSettingsChangeEvent = (): void => {
      runAsyncTask(async () => {
        await handleThemeSettingsChange(readSettingsFormValues());
      });
    },
    handleLanguageChangeEvent = (): void => {
      runAsyncTask(async () => {
        await handleLanguageChange(readSettingsFormValues());
      });
    };
  saveKey.addEventListener("click", () => {
    runAsyncTask(async () => {
      await handleSaveSettings(readSettingsFormValues());
    });
  });
  cancelSettings.addEventListener("click", () => {
    runAsyncTask(async () => {
      await handleCancelSettings();
    });
  });
  openSettings.addEventListener("click", () => {
    runAsyncTask(async () => {
      await handleOpenSettings();
    });
  });
  [keyInput, baseUrlInput, modelInput, requestBodyOverridesInput].forEach(
    (inputElement) => {
      inputElement.addEventListener("input", syncSaveButtonVisibility);
    },
  );
  apiTypeSelect.addEventListener("change", () => {
    runAsyncTask(handleApiTypeChange);
  });
  [themeSelect, themeColorInput, themeVariantSelect].forEach((themeElement) => {
    themeElement.addEventListener("change", handleThemeSettingsChangeEvent);
  });
  languageSelect.addEventListener("change", handleLanguageChangeEvent);
  followModeSwitch.addEventListener("change", () => {
    runAsyncTask(async () => {
      await handleFollowModeChangeClick(followModeSwitch.selected);
    });
  });
  codexLoginButton.addEventListener("click", () => {
    runAsyncTask(handleCodexLoginClick);
  });
  syncCodexAuthUi();
  syncSaveButtonVisibility();
};

export default bindSettingsEvents;
