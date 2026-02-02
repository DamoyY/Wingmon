import { updateComposerButtonsState } from "./composerView.js";
import { setPromptContent } from "./composerState.js";

const resolvePromptValue = (event) => {
  const target = event?.target;
  if (!target || typeof target.value !== "string") {
    throw new Error("输入框事件无效");
  }
  return target.value;
};

export const handlePromptInput = (event) => {
  setPromptContent(resolvePromptValue(event));
  updateComposerButtonsState();
};

export const createPromptKeydownHandler = (sendMessage) => {
  if (typeof sendMessage !== "function") {
    throw new Error("发送方法无效");
  }
  return (event) => {
    if (!event || typeof event.key !== "string") {
      throw new Error("键盘事件无效");
    }
    if (event.key === "Enter" && !event.shiftKey) {
      setPromptContent(resolvePromptValue(event));
      event.preventDefault();
      sendMessage();
    }
  };
};
