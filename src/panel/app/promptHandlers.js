import { updateComposerButtonsState } from "./composerState.js";
import { sendMessage } from "./messageSendFlow.js";

export const handlePromptInput = () => {
  updateComposerButtonsState();
};

export const handlePromptKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};
