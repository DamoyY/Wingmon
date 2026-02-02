const enablePanelBehavior = async () => {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  },
  openPanelForTab = async (tab) => {
    if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  },
  registerContentScriptReadyListener = () => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type !== "contentScriptReady") {
        return false;
      }
      if (!sender?.tab) {
        sendResponse({ error: "未找到消息来源标签页" });
        return true;
      }
      sendResponse({ ok: true });
      return true;
    });
  };

enablePanelBehavior();
chrome.runtime.onInstalled.addListener(() => {
  enablePanelBehavior();
});
chrome.action.onClicked.addListener(async (tab) => {
  await openPanelForTab(tab);
});
registerContentScriptReadyListener();
