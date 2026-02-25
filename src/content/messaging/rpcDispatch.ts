import {
  type ContentScriptRequestByType,
  type ContentScriptRequestType,
  type ContentScriptResponseByType,
  type ContentScriptRpcHandlerMap,
  extractErrorMessage,
} from "../../shared/index.ts";
import { setFocusRippleEnabled } from "./focusRipple/index.js";
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
  enterText: (message, sendResponse) => {
    return handleEnterText(message, sendResponse);
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
  setFocusRipple: (message, sendResponse): void => {
    setFocusRippleEnabled(message.enabled);
    sendResponse({ enabled: message.enabled, ok: true });
  },
  setPageHash: (message, sendResponse): void => {
    handleSetPageHash(message, sendResponse);
  },
};

export const dispatchContentScriptMessage = <
  TType extends ContentScriptRequestType,
>(
  message: ContentScriptRequestByType<TType>,
  sendResponse: (response: ContentScriptResponseByType<TType>) => void,
): boolean | undefined => {
  const handler = contentScriptHandlers[message.type];
  const result = handler(message, sendResponse);
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
