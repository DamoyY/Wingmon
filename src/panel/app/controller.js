import {
  saveKey,
  cancelSettings,
  openSettings,
  sendButton,
  sendWithPageButton,
  stopButton,
  promptEl,
  newChatButton,
  historyButton,
  themeSelect,
} from "../ui/index.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";
import {
  handleSaveSettings,
  handleCancelSettings,
  handleOpenSettings,
  handleThemeChange,
} from "./settingsController.js";
import {
  sendMessage,
  sendMessageWithPage,
  stopSending,
  handlePromptKeydown,
} from "./messageSender.js";
import {
  bindHistoryPanelOutsideClose,
  handleNewChat,
  toggleHistoryPanel,
} from "./historyPanel.js";

const bindEvents = () => {
  saveKey.addEventListener("click", handleSaveSettings);
  cancelSettings.addEventListener("click", handleCancelSettings);
  openSettings.addEventListener("click", handleOpenSettings);
  sendButton.addEventListener("click", sendMessage);
  sendWithPageButton.addEventListener("click", sendMessageWithPage);
  stopButton.addEventListener("click", stopSending);
  promptEl.addEventListener("keydown", handlePromptKeydown);
  newChatButton.addEventListener("click", handleNewChat);
  historyButton.addEventListener("click", toggleHistoryPanel);
  themeSelect.addEventListener("change", handleThemeChange);
  bindHistoryPanelOutsideClose();
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
