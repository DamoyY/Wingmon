import {
  addMessage,
  removeMessage,
  state,
  updateMessage,
} from "../../shared/state/panelStateContext.ts";
import type { ToolCall } from "../agent/definitions.ts";
import { attachToolCallsToAssistant } from "../agent/toolCallNormalization.ts";
import { createRandomId } from "../../shared/index.ts";
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
    throw new Error("未收到有效回复");
  }
  if (assistantMessage.pending && hasText && !pendingToolCalls.length) {
    updateMessage(assistantIndex, { pending: false });
  }
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
  }
  if (pendingToolCalls.length > 0) {
    attachToolCalls(pendingToolCalls, resolvedIndex);
  }
  if (!reply && !pendingToolCalls.length) {
    if (resolvedIndex !== null) {
      removeMessage(resolvedIndex);
    }
    throw new Error("未收到有效回复");
  }
};
