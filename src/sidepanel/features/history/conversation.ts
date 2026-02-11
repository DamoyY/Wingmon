import {
  deleteConversation,
  loadConversation,
} from "../../core/services/index.ts";
import {
  loadConversationState,
  resetConversation,
  state,
} from "../../core/store/index.ts";
import { renderMessagesView } from "../chat/messages/index.ts";

export const loadConversationIntoState = async (id: string): Promise<void> => {
  const conversation = await loadConversation(id);
  loadConversationState(
    conversation.id,
    conversation.messages,
    conversation.updatedAt,
  );
  renderMessagesView();
};

export const deleteConversationById = async (id: string): Promise<void> => {
  await deleteConversation(id);
  if (id !== state.conversationId) {
    return;
  }
  resetConversation();
  renderMessagesView();
};
