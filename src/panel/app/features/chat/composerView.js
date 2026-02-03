import {
  elements,
  setComposerButtonsSending,
  setSendButtonEnabled,
} from "../../../ui/index.ts";
import { setSendWithPagePromptReady } from "../messages/sendWithPageButton.js";
import { hasPromptContent } from "./composerState.js";

const ensurePromptElement = () => {
  const { promptEl } = elements;
  if (!promptEl) {
    throw new Error("输入框未找到");
  }
  return promptEl;
};

export const updateComposerButtonsState = () => {
  const hasContent = hasPromptContent();
  setSendButtonEnabled(hasContent);
  setSendWithPagePromptReady(hasContent);
};

export const clearPromptInput = () => {
  const promptEl = ensurePromptElement();
  promptEl.value = "";
};

export const setComposerSending = (sending) => {
  setComposerButtonsSending(sending);
};
