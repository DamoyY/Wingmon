import { addMessage, removeMessage, state } from "../../../core/store/index.ts";
import { createRandomId } from "../../../lib/utils/index.ts";

const isPendingAssistantAtIndex = (index: number): boolean => {
    const message = state.messages.at(index);
    if (!message || message.role !== "assistant") {
      return false;
    }
    return message.pending === true;
  },
  resolvePendingAssistantIndex = (
    assistantIndex: number | null,
  ): number | null => {
    if (
      assistantIndex !== null &&
      Number.isInteger(assistantIndex) &&
      assistantIndex >= 0 &&
      isPendingAssistantAtIndex(assistantIndex)
    ) {
      return assistantIndex;
    }
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      if (isPendingAssistantAtIndex(i)) {
        return i;
      }
    }
    return null;
  };

export const createPendingAssistant = (): number => {
  addMessage({
    content: "",
    groupId: createRandomId("assistant"),
    pending: true,
    role: "assistant",
  });
  const pendingAssistantIndex = state.messages.length - 1;
  if (!Number.isInteger(pendingAssistantIndex) || pendingAssistantIndex < 0) {
    throw new Error("助手占位消息创建失败");
  }
  return pendingAssistantIndex;
};

export const clearPendingAssistant = (assistantIndex: number | null): void => {
  const resolvedAssistantIndex = resolvePendingAssistantIndex(assistantIndex);
  if (resolvedAssistantIndex === null) {
    return;
  }
  const message = state.messages.at(resolvedAssistantIndex);
  if (!message || message.role !== "assistant" || message.pending !== true) {
    return;
  }
  const hasContent =
    typeof message.content === "string" && Boolean(message.content.trim());
  if (hasContent) {
    return;
  }
  const indices = [resolvedAssistantIndex];
  for (let i = resolvedAssistantIndex + 1; i < state.messages.length; i += 1) {
    const nextMessage = state.messages.at(i);
    if (!nextMessage) {
      break;
    }
    if (!nextMessage.hidden) {
      break;
    }
    indices.push(i);
  }
  indices
    .sort((a, b) => b - a)
    .forEach((index) => {
      removeMessage(index);
    });
};
