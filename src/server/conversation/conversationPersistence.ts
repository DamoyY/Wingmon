import { state, touchUpdatedAt } from "../../shared/state/panelStateContext.ts";
import { persistConversation } from "../services/index.ts";

type PersistConversationStateOptions = {
  deleteWhenEmpty?: boolean;
};

export const persistConversationState = async ({
  deleteWhenEmpty = true,
}: PersistConversationStateOptions = {}): Promise<void> => {
  const hasMessages = state.messages.length > 0;
  if (hasMessages) {
    touchUpdatedAt();
  } else if (!deleteWhenEmpty) {
    return;
  }
  await persistConversation(
    state.conversationId,
    state.messages,
    state.updatedAt,
  );
};
