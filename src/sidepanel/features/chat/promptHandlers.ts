import { setPromptContent } from "./composerState.ts";
import { updateComposerButtonsState } from "./composerView.ts";

type PromptValueTarget = {
  value: string;
};

type PromptEventLike = {
  target: EventTarget | PromptValueTarget | null;
};

const hasPromptValue = (
  target: EventTarget | PromptValueTarget | null,
): target is PromptValueTarget =>
  typeof target === "object" &&
  target !== null &&
  "value" in target &&
  typeof target.value === "string";

const resolvePromptValue = (event: PromptEventLike): string => {
  const { target } = event;
  if (!hasPromptValue(target)) {
    throw new Error("输入框事件无效");
  }
  return target.value;
};

export const handlePromptInput = (event: PromptEventLike): void => {
  setPromptContent(resolvePromptValue(event));
  updateComposerButtonsState();
};

export const createPromptKeydownHandler = (
  sendMessage: () => void | Promise<void>,
): ((event: KeyboardEvent) => void) => {
  if (typeof sendMessage !== "function") {
    throw new Error("发送方法无效");
  }
  return (event: KeyboardEvent): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      setPromptContent(resolvePromptValue(event));
      event.preventDefault();
      void sendMessage();
    }
  };
};
