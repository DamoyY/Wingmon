import { elements } from "../../ui/index.js";
import {
  createPromptKeydownHandler,
  handleNewChat,
  handlePromptInput,
} from "../features/chat/index.js";
import {
  sendMessage,
  sendMessageWithPage,
  stopSending,
} from "../features/messages/index.js";

const bindComposerEvents = () => {
  const {
      sendButton,
      sendWithPageButton,
      stopButton,
      promptEl,
      newChatButton,
    } = elements,
    handlePromptKeydown = createPromptKeydownHandler(sendMessage);
  sendButton.addEventListener("click", sendMessage);
  sendWithPageButton.addEventListener("click", sendMessageWithPage);
  stopButton.addEventListener("click", stopSending);
  promptEl.addEventListener("keydown", handlePromptKeydown);
  promptEl.addEventListener("input", handlePromptInput);
  handlePromptInput({ target: promptEl });
  newChatButton.addEventListener("click", handleNewChat);
};

export default bindComposerEvents;
