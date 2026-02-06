import {
  handleClickButton,
  handleEnterText,
  handleGetPageContent,
  handleSetPageHash,
} from "../handlers/index.js";
import {
  isContentScriptRequest,
  type ContentScriptRequestByType,
  type ContentScriptRequestType,
  type ContentScriptRpcHandlerMap,
  type ContentScriptResponseByRequest,
  type ContentScriptResponseByType,
} from "../../shared/index.ts";

const resolveErrorMessage = (error: unknown, fallback = "未知错误"): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string" && error.trim()) {
      return error;
    }
    return fallback;
  },
  contentScriptHandlers: ContentScriptRpcHandlerMap = {
    ping: (_message, sendResponse): void => {
      const body = document.querySelector("body");
      if (!body) {
        sendResponse({ error: "页面没有可用的 body" });
        return;
      }
      sendResponse({ ok: true });
    },
    getPageContent: (message, sendResponse) => {
      return handleGetPageContent(message, sendResponse);
    },
    setPageHash: (message, sendResponse): void => {
      handleSetPageHash(message, sendResponse);
    },
    clickButton: (message, sendResponse): void => {
      handleClickButton(message, sendResponse);
    },
    enterText: (message, sendResponse): void => {
      handleEnterText(message, sendResponse);
    },
  };

const dispatchMessage = <TType extends ContentScriptRequestType>(
  message: ContentScriptRequestByType<TType>,
  sendResponse: (response: ContentScriptResponseByType<TType>) => void,
): boolean | undefined => {
  const handler = contentScriptHandlers[message.type],
    result = handler(message, sendResponse);
  if (result instanceof Promise) {
    void result.catch((error: unknown) => {
      const messageText = resolveErrorMessage(error);
      console.error(messageText);
      sendResponse({ error: messageText });
    });
    return true;
  }
  return;
};

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    if (!isContentScriptRequest(message)) {
      return;
    }
    const sendTypedResponse = (
      response: ContentScriptResponseByRequest<typeof message>,
    ): void => {
      sendResponse(response);
    };
    try {
      return dispatchMessage(message, sendTypedResponse);
    } catch (error: unknown) {
      const messageText = resolveErrorMessage(error);
      console.error(messageText);
      sendTypedResponse({ error: messageText });
    }
    return;
  });
};

export default registerMessageListener;
