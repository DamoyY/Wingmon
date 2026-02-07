export const reloadTab = async (tabId: number): Promise<void> => {
  if (typeof tabId !== "number") {
    const error = new Error("Tab ID 必须是数字");
    console.error(error.message);
    throw error;
  }
  try {
    await chrome.tabs.reload(tabId);
  } catch (error) {
    const failure =
      error instanceof Error && error.message.trim()
        ? error
        : new Error("无法重新加载标签页");
    console.error(failure.message);
    throw failure;
  }
};
