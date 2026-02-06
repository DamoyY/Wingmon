import {
  elements,
  setComposerButtonsSending,
  setSendButtonEnabled,
} from "../../ui/index.ts";
import { setSendWithPagePromptReady } from "./messages/sendWithPageButton.ts";
import { hasPromptContent } from "./composerState.ts";

type PromptElement = (typeof elements)["promptEl"];

const ensurePromptElement = (): PromptElement => elements.promptEl;

export const updateComposerButtonsState = (): void => {
  const hasContent = hasPromptContent();
  setSendButtonEnabled(hasContent);
  setSendWithPagePromptReady(hasContent);
};

export const clearPromptInput = (): void => {
  const promptEl = ensurePromptElement();
  promptEl.value = "";
};

export const setComposerSending = (sending: boolean): void => {
  setComposerButtonsSending(sending);
};
