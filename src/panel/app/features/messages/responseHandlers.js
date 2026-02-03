import {
  addMessage,
  removeMessage,
  state,
  updateMessage,
} from "../../../state/index.js";
import { attachToolCallsToAssistant } from "../../../tools/index.js";
import { renderMessagesView } from "./presenter.js";

const normalizeToolCalls = (toolCalls) =>
  Array.isArray(toolCalls) ? toolCalls : [];

const resolveAssistantIndex = (assistantIndex) => {
  if (!Number.isInteger(assistantIndex)) {
    return null;
  }
  const message = state.messages[assistantIndex];
  if (!message || message.role !== "assistant") {
    return null;
  }
  return assistantIndex;
};

export const applyStreamedResponse = (toolCalls, assistantIndex) => {
  if (!Number.isInteger(assistantIndex)) {
    throw new Error("流式回复缺少消息索引");
  }
  const pendingToolCalls = normalizeToolCalls(toolCalls),
    assistantMessage = state.messages[assistantIndex],
    hasText = Boolean(assistantMessage?.content?.trim());
  if (pendingToolCalls.length) {
    attachToolCallsToAssistant(pendingToolCalls, assistantIndex);
  }
  if (!hasText && !pendingToolCalls.length) {
    removeMessage(assistantIndex);
    renderMessagesView();
    throw new Error("未收到有效回复");
  }
  if (assistantMessage?.pending && hasText) {
    updateMessage(assistantIndex, { pending: false });
  }
  renderMessagesView();
};

export const applyNonStreamedResponse = (reply, toolCalls, assistantIndex) => {
  const pendingToolCalls = normalizeToolCalls(toolCalls),
    resolvedIndex = resolveAssistantIndex(assistantIndex);
  if (reply) {
    if (resolvedIndex !== null) {
      updateMessage(resolvedIndex, { content: reply, pending: false });
    } else {
      addMessage({ role: "assistant", content: reply });
    }
    renderMessagesView();
  }
  if (pendingToolCalls.length) {
    attachToolCallsToAssistant(pendingToolCalls, resolvedIndex ?? undefined);
    renderMessagesView();
  }
  if (!reply && !pendingToolCalls.length) {
    if (resolvedIndex !== null) {
      removeMessage(resolvedIndex);
      renderMessagesView();
    }
    throw new Error("未收到有效回复");
  }
};
