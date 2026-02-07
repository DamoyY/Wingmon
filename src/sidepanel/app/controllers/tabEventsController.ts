import { refreshSendWithPageButton } from "../../features/chat/messages/index.ts";

const bindTabEvents = (): void => {
  chrome.tabs.onActivated.addListener(() => {
    void refreshSendWithPageButton();
  });
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab.active) {
      return;
    }
    if (changeInfo.url || changeInfo.status === "complete") {
      void refreshSendWithPageButton();
    }
  });
};

export default bindTabEvents;
