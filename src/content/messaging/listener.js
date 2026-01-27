import { handleGetPageContent } from "../handlers/getPageContent";
import { handleClickButton } from "../handlers/clickButton";

export const registerMessageListener = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message?.type === "ping") {
        if (!document.body) {
          sendResponse({ error: "页面没有可用的 body" });
          return;
        }
        sendResponse({ ok: true });
        return;
      }
      if (message?.type === "getPageContent") {
        handleGetPageContent(sendResponse);
        return;
      }
      if (message?.type === "clickButton") {
        handleClickButton(message, sendResponse);
        return;
      }
      if (message?.type === "ClickButton") {
        handleClickButton(message, sendResponse);
      }
    } catch (error) {
      sendResponse({ error: error?.message || "未知错误" });
    }
  });
};
