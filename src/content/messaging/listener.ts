import {
  type ContentScriptResponseByRequest,
  extractErrorMessage,
  isContentScriptRequest,
} from "../../shared/index.ts";
import { dispatchContentScriptMessage } from "./rpcDispatch.js";

type RuntimeMessageValue = object | string | number | boolean | null;

const toRuntimeMessageValue = (value: unknown): RuntimeMessageValue => {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "object" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
};

const isMessageWithType = (
  value: RuntimeMessageValue,
): value is { type: unknown } => {
  return typeof value === "object" && value !== null && "type" in value;
};

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    const messageValue = toRuntimeMessageValue(message);
    if (!isContentScriptRequest(messageValue)) {
      if (isMessageWithType(messageValue)) {
        console.error("收到无效的内容脚本 RPC 请求", messageValue);
      }
      return;
    }
    const sendTypedResponse = (
      response: ContentScriptResponseByRequest<typeof messageValue>,
    ): void => {
      sendResponse(response);
    };
    try {
      return dispatchContentScriptMessage(messageValue, sendTypedResponse);
    } catch (error: unknown) {
      const messageText = extractErrorMessage(error);
      console.error(messageText);
      sendTypedResponse({ error: messageText });
    }
    return;
  });
};

export default registerMessageListener;
