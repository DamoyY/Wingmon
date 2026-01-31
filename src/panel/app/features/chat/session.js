import { fadeOutMessages, resetMessagesFade } from "../../../ui/index.js";
import { resetConversation, state } from "../../../state/index.js";
import { renderMessagesView } from "../messages/presenter.js";

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
