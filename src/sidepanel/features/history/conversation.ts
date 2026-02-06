import {
  loadConversationState,
  resetConversation,
  state,
} from "../../core/store/index.ts";
import { renderMessagesView } from "../chat/messages/index.ts";
import { fetchConversationById, removeConversationById } from "./data.ts";

export const loadConversationIntoState = async (id: string): Promise<void> => {
  const conversation = await fetchConversationById(id);
  loadConversationState(
    conversation.id,
    conversation.messages,
    conversation.updatedAt,
  );
  renderMessagesView();
};

export const deleteConversationById = async (id: string): Promise<void> => {
  await removeConversationById(id);
  if (id !== state.conversationId) {
    return;
  }
  resetConversation();
  renderMessagesView();
};
