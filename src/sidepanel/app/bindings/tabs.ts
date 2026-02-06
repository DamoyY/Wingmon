import { refreshSendWithPageButton } from "../../features/chat/messages/index.ts";

type ChromeTab = {
  active?: boolean;
};

type ChromeTabChangeInfo = {
  status?: string;
  url?: string;
};

type ChromeTabsApi = {
  onActivated: {
    addListener: (callback: () => void) => void;
  };
  onUpdated: {
    addListener: (
      callback: (
        tabId: number,
        changeInfo: ChromeTabChangeInfo,
        tab: ChromeTab,
      ) => void,
    ) => void;
  };
};

declare const chrome: {
  tabs: ChromeTabsApi;
};

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
