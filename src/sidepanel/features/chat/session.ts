import { fadeOutMessages, resetMessagesFade } from "../../ui/index.ts";
import { resetConversation, state } from "../../core/store/index.ts";
import { renderMessagesView } from "./messages/index.ts";

const handleNewChat = async (): Promise<void> => {
  if (state.sending) {
    return;
  }
  await fadeOutMessages();
  resetConversation();
  renderMessagesView();
  resetMessagesFade();
};

export default handleNewChat;
