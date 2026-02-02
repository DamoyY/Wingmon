import { refreshSendWithPageButton } from "../features/messages/index.js";

const bindTabEvents = () => {
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

export default bindTabEvents;
