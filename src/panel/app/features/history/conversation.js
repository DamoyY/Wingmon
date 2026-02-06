import {
  loadConversationState,
  resetConversation,
  state,
} from "../../../state/index.ts";
import {
  deleteConversation,
  loadConversation,
} from "../../../services/index.ts";
import { renderMessagesView } from "../messages/index.js";

export const loadConversationIntoState = async (id) => {
  const conversation = await loadConversation(id);
  loadConversationState(
    conversation.id,
    conversation.messages,
    conversation.updatedAt,
  );
  renderMessagesView();
};

export const deleteConversationById = async (id) => {
  await deleteConversation(id);
  if (id !== state.conversationId) {
    return;
  }
  resetConversation();
  renderMessagesView();
};
