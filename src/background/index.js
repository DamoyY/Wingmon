const enablePanel = async () => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
};
chrome.runtime.onInstalled.addListener(() => {
  enablePanel();
});
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
