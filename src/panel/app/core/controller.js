import { elements } from "../../ui/index.js";
import { refreshSendWithPageButton } from "../features/messages/sendWithPageButton.js";
import { updateSettings } from "../../services/index.js";
import {
  handleSaveSettings,
  handleCancelSettings,
  handleOpenSettings,
  handleSettingsFieldChange,
  handleThemeChange,
  handleThemeColorChange,
  handleLanguageChange,
} from "../features/settings/controller.js";
import {
  sendMessage,
  sendMessageWithPage,
  stopSending,
} from "../features/messages/sendFlow.js";
import {
  handlePromptKeydown,
  handlePromptInput,
} from "../features/chat/promptHandlers.js";
import handleNewChat from "../features/chat/session.js";
import {
  handleOpenHistory,
  handleCloseHistory,
} from "../features/history/panel.js";

const bindEvents = () => {
  const {
    saveKey,
    cancelSettings,
    openSettings,
    sendButton,
    sendWithPageButton,
    stopButton,
    keyInput,
    baseUrlInput,
    modelInput,
    apiTypeSelect,
    promptEl,
    newChatButton,
    historyButton,
    closeHistoryButton,
    themeSelect,
    themeColorInput,
    followModeSwitch,
    languageSelect,
  } = elements;
  saveKey.addEventListener("click", handleSaveSettings);
  cancelSettings.addEventListener("click", handleCancelSettings);
  openSettings.addEventListener("click", handleOpenSettings);
  keyInput.addEventListener("input", handleSettingsFieldChange);
  baseUrlInput.addEventListener("input", handleSettingsFieldChange);
  modelInput.addEventListener("input", handleSettingsFieldChange);
  apiTypeSelect.addEventListener("change", handleSettingsFieldChange);
  sendButton.addEventListener("click", sendMessage);
  sendWithPageButton.addEventListener("click", sendMessageWithPage);
  stopButton.addEventListener("click", stopSending);
  promptEl.addEventListener("keydown", handlePromptKeydown);
  promptEl.addEventListener("input", handlePromptInput);
  newChatButton.addEventListener("click", handleNewChat);
  historyButton.addEventListener("click", handleOpenHistory);
  closeHistoryButton.addEventListener("click", handleCloseHistory);
  themeSelect.addEventListener("change", handleThemeChange);
  themeColorInput.addEventListener("change", handleThemeColorChange);
  languageSelect.addEventListener("change", handleLanguageChange);
  followModeSwitch.addEventListener("change", async () => {
    await updateSettings({ followMode: Boolean(followModeSwitch.selected) });
  });
  chrome.tabs.onActivated.addListener(() => {
    refreshSendWithPageButton();
  });
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab?.active) {
      return;
    }
    if (changeInfo.url || changeInfo.status === "complete") {
      refreshSendWithPageButton();
    }
  });
};

export default bindEvents;
