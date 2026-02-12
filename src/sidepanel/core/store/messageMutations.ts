import { addMessage, state, updateMessage } from "./store.ts";
import { createRandomId } from "../../lib/utils/index.ts";

export const appendAssistantDelta = (
  delta: string | null | undefined,
): void => {
  if (delta === undefined || delta === null) {
    return;
  }
  if (delta.length === 0) {
    return;
  }
  let targetIndex: number | null = null;
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    const message = state.messages[i];
    if (message.role === "assistant" && message.pending) {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex === null) {
    const last = state.messages.at(-1);
    if (!last || last.role !== "assistant") {
      addMessage({
        content: delta,
        groupId: createRandomId("assistant"),
        role: "assistant",
      });
      return;
    }
    targetIndex = state.messages.length - 1;
  }
  updateMessage(targetIndex, (current) => ({
    ...current,
    content: `${current.content}${delta}`,
  }));
};
