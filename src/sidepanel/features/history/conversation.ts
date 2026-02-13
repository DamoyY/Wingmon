import {
  requestDeleteConversation,
  requestLoadConversation,
} from "../../core/server/index.ts";

export const loadConversationIntoState = async (id: string): Promise<void> => {
  await requestLoadConversation(id);
};

export const deleteConversationById = async (id: string): Promise<void> => {
  await requestDeleteConversation(id);
};
