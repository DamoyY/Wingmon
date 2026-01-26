const enablePanel = async () => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
};
const serializeConsoleResult = (result) => {
  if (typeof result === "string") return result;
  if (typeof result === "undefined") return "undefined";
  if (result === null) return "null";
  const serialized = JSON.stringify(result);
  if (typeof serialized !== "string") {
    throw new Error("结果不可序列化");
  }
  return serialized;
};
const handleRunConsoleCommand = async (message, sendResponse) => {
  const command =
    typeof message?.command === "string" ? message.command.trim() : "";
  if (!command) {
    sendResponse({ error: "command 必须是非空字符串" });
    return;
  }
  try {
    let result = eval(command);
    if (result instanceof Promise) {
      result = await result;
    }
    const output = serializeConsoleResult(result);
    sendResponse({ ok: true, output });
  } catch (error) {
    sendResponse({ error: error?.message || "命令执行失败" });
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message?.type === "runConsoleCommand") {
      handleRunConsoleCommand(message, sendResponse);
      return true;
    }
  } catch (error) {
    sendResponse({ error: error?.message || "未知错误" });
  }
});
