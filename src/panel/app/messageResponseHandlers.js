import { removeMessage, addMessage, state } from "../state/index.js";
import { attachToolCallsToAssistant } from "../tools/index.js";
import { renderMessagesView } from "./messagePresenter.js";

const normalizeToolCalls = (toolCalls) =>
  Array.isArray(toolCalls) ? toolCalls : [];

export const applyStreamedResponse = (toolCalls, assistantIndex) => {
  if (!Number.isInteger(assistantIndex)) {
    throw new Error("流式回复缺少消息索引");
  }
  const pendingToolCalls = normalizeToolCalls(toolCalls);
  const assistantMessage = state.messages[assistantIndex];
  const hasText = Boolean(assistantMessage?.content?.trim());
  if (pendingToolCalls.length) {
    attachToolCallsToAssistant(pendingToolCalls, assistantIndex);
  }
  if (!hasText && !pendingToolCalls.length) {
    removeMessage(assistantIndex);
    renderMessagesView();
    throw new Error("未收到有效回复");
  }
  renderMessagesView();
};

export const applyNonStreamedResponse = (reply, toolCalls) => {
  const pendingToolCalls = normalizeToolCalls(toolCalls);
  if (reply) {
    addMessage({ role: "assistant", content: reply });
    renderMessagesView();
  }
  if (pendingToolCalls.length) {
    attachToolCallsToAssistant(pendingToolCalls);
    renderMessagesView();
  }
  if (!reply && !pendingToolCalls.length) {
    throw new Error("未收到有效回复");
  }
};
