import {
  handleClickButton,
  handleEnterText,
  handleGetPageContent,
  handleSetPageHash,
} from "../handlers/index.js";

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    try {
      if (message?.type === "ping") {
        const body = document.querySelector("body");
        if (!body) {
          sendResponse({ error: "页面没有可用的 body" });
          return;
        }
        sendResponse({ ok: true });
        return;
      }
      if (message?.type === "getPageContent") {
        void handleGetPageContent(message, sendResponse);
        return true;
      }
      if (message?.type === "setPageHash") {
        handleSetPageHash(message, sendResponse);
        return true;
      }
      if (message?.type === "clickButton") {
        handleClickButton(message, sendResponse);
        return;
      }
      if (message?.type === "enterText") {
        handleEnterText(message, sendResponse);
        return;
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "未知错误";
      console.error(messageText);
      sendResponse({ error: messageText });
    }
    return;
  });
};

export default registerMessageListener;
