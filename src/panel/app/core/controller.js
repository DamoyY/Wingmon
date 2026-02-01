import { elements } from "../../ui/index.js";
import { updateSettings } from "../../services/index.js";
import {
  handleNewChat,
  handlePromptInput,
  handlePromptKeydown,
} from "../features/chat/index.js";
import {
  handleCloseHistory,
  handleOpenHistory,
} from "../features/history/index.js";
import {
  refreshSendWithPageButton,
  sendMessage,
  sendMessageWithPage,
  stopSending,
} from "../features/messages/index.js";
import {
  handleCancelSettings,
  handleLanguageChange,
  handleOpenSettings,
  handleSaveSettings,
  handleSettingsFieldChange,
  handleThemeChange,
  handleThemeColorChange,
} from "../features/settings/index.js";

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
