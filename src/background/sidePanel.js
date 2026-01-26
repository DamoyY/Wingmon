export const enablePanelBehavior = async () => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
};
export const openPanelForTab = async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
};
