import {
  type ContentScriptRequestByType,
  type ContentScriptRequestType,
  type ContentScriptResponseByRequest,
  type ContentScriptResponseByType,
  type ContentScriptRpcHandlerMap,
  extractErrorMessage,
  isContentScriptRequest,
} from "../../shared/index.ts";
import {
  handleClickButton,
  handleEnterText,
  handleGetAllPageContent,
  handleGetPageContent,
  handleSetPageHash,
} from "../handlers/index.js";

const contentScriptHandlers: ContentScriptRpcHandlerMap = {
  clickButton: (message, sendResponse) => {
    return handleClickButton(message, sendResponse);
  },
  enterText: (message, sendResponse): void => {
    handleEnterText(message, sendResponse);
  },
  getAllPageContent: (message, sendResponse) => {
    return handleGetAllPageContent(message, sendResponse);
  },
  getPageContent: (message, sendResponse) => {
    return handleGetPageContent(message, sendResponse);
  },
  ping: (_message, sendResponse): void => {
    const body = document.querySelector("body");
    if (!body) {
      sendResponse({ error: "页面没有可用的 body" });
      return;
    }
    sendResponse({ ok: true });
  },
  setPageHash: (message, sendResponse): void => {
    handleSetPageHash(message, sendResponse);
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
      const messageText = extractErrorMessage(error);
      console.error(messageText);
      sendResponse({ error: messageText });
    });
    return true;
  }
  return;
};

const toRuntimeMessageValue = (
  value: unknown,
): object | string | number | boolean | null => {
  if (
    value === null ||
    typeof value === "object" ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
};

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    const messageValue = toRuntimeMessageValue(message);
    if (!isContentScriptRequest(messageValue)) {
      return;
    }
    const sendTypedResponse = (
      response: ContentScriptResponseByRequest<typeof messageValue>,
    ): void => {
      sendResponse(response);
    };
    try {
      return dispatchMessage(messageValue, sendTypedResponse);
    } catch (error: unknown) {
      const messageText = extractErrorMessage(error);
      console.error(messageText);
      sendTypedResponse({ error: messageText });
    }
    return;
  });
};

export default registerMessageListener;
