import {
  elements,
  setComposerButtonsSending,
  setSendButtonEnabled,
} from "../../../ui/index.ts";
import { setSendWithPagePromptReady } from "../messages/sendWithPageButton.js";
import { hasPromptContent } from "./composerState.ts";

type PromptElement = (typeof elements)["promptEl"];

const setSendButtonEnabledSafe = setSendButtonEnabled as (
  enabled: boolean,
) => void;
const setSendWithPagePromptReadySafe = setSendWithPagePromptReady as (
  ready: boolean,
) => void;
const setComposerButtonsSendingSafe = setComposerButtonsSending as (
  sending: boolean,
) => void;

const ensurePromptElement = (): PromptElement => {
  const promptEl = (elements as { promptEl?: PromptElement }).promptEl;
  if (!promptEl) {
    throw new Error("输入框未找到");
  }
  return promptEl;
};

export const updateComposerButtonsState = (): void => {
  const hasContent = hasPromptContent();
  setSendButtonEnabledSafe(hasContent);
  setSendWithPagePromptReadySafe(hasContent);
};

export const clearPromptInput = (): void => {
  const promptEl = ensurePromptElement();
  promptEl.value = "";
};

export const setComposerSending = (sending: boolean): void => {
  setComposerButtonsSendingSafe(sending);
};
