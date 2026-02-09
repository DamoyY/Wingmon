import {
  addMessage,
  removeMessage,
  state,
  updateMessage,
} from "../../../core/store/index.ts";
import type { ToolCall } from "../../../core/agent/definitions.ts";
import { attachToolCallsToAssistant } from "../../../core/agent/toolCallNormalization.ts";
import { createRandomId } from "../../../lib/utils/index.ts";
import { renderMessagesView } from "./presenter.ts";
const normalizeToolCalls = (toolCalls: ToolCall[] | null): ToolCall[] =>
    Array.isArray(toolCalls) ? toolCalls : [],
  attachToolCalls = (
    toolCalls: ToolCall[],
    assistantIndex: number | null,
  ): void => {
    if (!toolCalls.length) {
      return;
    }
    if (assistantIndex === null) {
      attachToolCallsToAssistant(toolCalls);
      return;
    }
    attachToolCallsToAssistant(toolCalls, assistantIndex);
  };

const resolveAssistantIndex = (
  assistantIndex: number | null,
): number | null => {
  if (assistantIndex === null || !Number.isInteger(assistantIndex)) {
    return null;
  }
  const message = state.messages.at(assistantIndex);
  if (!message || message.role !== "assistant") {
    return null;
  }
  return assistantIndex;
};

export const applyStreamedResponse = (
  toolCalls: ToolCall[] | null,
  assistantIndex: number | null,
): void => {
  if (!Number.isInteger(assistantIndex) || assistantIndex === null) {
    throw new Error("流式回复缺少消息索引");
  }
  const pendingToolCalls = normalizeToolCalls(toolCalls),
    assistantMessage = state.messages.at(assistantIndex);
  if (!assistantMessage || assistantMessage.role !== "assistant") {
    throw new Error("流式回复目标消息无效");
  }
  const hasText =
    typeof assistantMessage.content === "string" &&
    assistantMessage.content.trim().length > 0;
  attachToolCalls(pendingToolCalls, assistantIndex);
  if (!hasText && !pendingToolCalls.length) {
    removeMessage(assistantIndex);
    renderMessagesView();
    throw new Error("未收到有效回复");
  }
  if (
    assistantMessage.pending === true &&
    hasText &&
    !pendingToolCalls.length
  ) {
    updateMessage(assistantIndex, { pending: false });
  }
  renderMessagesView();
};

export const applyNonStreamedResponse = (
  reply: string,
  toolCalls: ToolCall[] | null,
  assistantIndex: number | null,
): void => {
  const pendingToolCalls = normalizeToolCalls(toolCalls),
    resolvedIndex = resolveAssistantIndex(assistantIndex);
  if (reply) {
    if (resolvedIndex !== null) {
      if (pendingToolCalls.length > 0) {
        updateMessage(resolvedIndex, { content: reply });
      } else {
        updateMessage(resolvedIndex, { content: reply, pending: false });
      }
    } else {
      addMessage({
        content: reply,
        groupId: createRandomId("assistant"),
        role: "assistant",
      });
    }
    renderMessagesView();
  }
  if (pendingToolCalls.length > 0) {
    attachToolCalls(pendingToolCalls, resolvedIndex);
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
