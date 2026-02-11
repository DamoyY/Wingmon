import { state, touchUpdatedAt } from "../../../core/store/index.ts";
import { persistConversation } from "../../../core/services/index.ts";

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
