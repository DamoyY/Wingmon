import { elements } from "../../ui/index.ts";
import {
  createPromptKeydownHandler,
  handleNewChat,
  handlePromptInput,
} from "../../features/chat/index.ts";
import {
  sendMessage,
  sendMessageWithPage,
  stopSending,
} from "../../features/chat/messages/index.ts";

const bindComposerEvents = (): void => {
  const {
      sendButton,
      sendWithPageButton,
      stopButton,
      promptEl,
      newChatButton,
    } = elements,
    handlePromptKeydown = createPromptKeydownHandler(sendMessage);
  sendButton.addEventListener("click", () => {
    void sendMessage();
  });
  sendWithPageButton.addEventListener("click", () => {
    void sendMessageWithPage();
  });
  stopButton.addEventListener("click", () => {
    void stopSending();
  });
  promptEl.addEventListener("keydown", handlePromptKeydown);
  promptEl.addEventListener("input", handlePromptInput);
  handlePromptInput({ target: promptEl });
  newChatButton.addEventListener("click", () => {
    void handleNewChat();
  });
};

export default bindComposerEvents;
