import { fadeOutMessages, resetMessagesFade } from "../../../ui/index.ts";
import { resetConversation, state } from "../../../state/index.js";
import { renderMessagesView } from "../messages/index.js";

const handleNewChat = async () => {
  if (state.sending) {
    return;
  }
  await fadeOutMessages();
  resetConversation();
  renderMessagesView();
  resetMessagesFade();
};

export default handleNewChat;
