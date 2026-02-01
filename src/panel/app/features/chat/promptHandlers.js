import { updateComposerButtonsState } from "./composerView.js";
import { sendMessage } from "../messages/sendFlow.js";

export const handlePromptInput = () => {
  updateComposerButtonsState();
};

export const handlePromptKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};
