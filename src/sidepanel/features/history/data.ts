import {
  type ConversationRecord,
  deleteConversation,
  getHistory,
  loadConversation,
} from "../../core/services/index.ts";

export const fetchSortedHistory = async (): Promise<ConversationRecord[]> => {
  const history = await getHistory();
  return [...history].sort((a, b) => b.updatedAt - a.updatedAt);
};

export const fetchConversationById = async (
  id: string,
): Promise<ConversationRecord> => loadConversation(id);

export const removeConversationById = async (id: string): Promise<void> => {
  await deleteConversation(id);
};
