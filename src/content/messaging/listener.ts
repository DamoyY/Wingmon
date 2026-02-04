import {
  handleClickButton,
  handleEnterText,
  handleGetPageContent,
} from "../handlers/index.js";

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    try {
      if (message?.type === "ping") {
        const body = document.querySelector("body");
        if (!body) {
          sendResponse({ error: "页面没有可用的 body" });
          return undefined;
        }
        sendResponse({ ok: true });
        return undefined;
      }
      if (message?.type === "getPageContent") {
        void handleGetPageContent(sendResponse);
        return true;
      }
      if (message?.type === "clickButton") {
        handleClickButton(message, sendResponse);
        return undefined;
      }
      if (message?.type === "enterText") {
        handleEnterText(message, sendResponse);
        return undefined;
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "未知错误";
      console.error(messageText);
      sendResponse({ error: messageText });
    }
    return undefined;
  });
};

export default registerMessageListener;
