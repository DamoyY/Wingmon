import { state } from "../state/index.js";
import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
} from "./definitions.js";
import {
  collectPageReadDedupeSets,
  getToolOutputContent,
} from "./pageReadDedupe.js";

const toChatToolCallForRequest = (entry) => ({
  id: entry.callId,
  type: "function",
  function: { name: entry.name, arguments: entry.arguments },
});
const collectToolCallEntries = (toolCalls, removeToolCallIds) => {
  if (!Array.isArray(toolCalls)) {
    return [];
  }
  const entries = [];
  toolCalls.forEach((call) => {
    const callId = getToolCallId(call);
    const name = getToolCallName(call);
    if (removeToolCallIds.has(callId)) {
      return;
    }
    entries.push({
      call,
      callId,
      name,
      arguments: getToolCallArguments(call),
    });
  });
  return entries;
};
const hasTextContent = (message) =>
  typeof message?.content === "string" && Boolean(message.content.trim());
const findLastUserMessageIndex = (messages) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return i;
    }
  }
  return -1;
};
const stripToolCalls = (message) => {
  if (!message || !Array.isArray(message.tool_calls)) {
    return message;
  }
  const { tool_calls: _, ...rest } = message;
  return rest;
};
const buildHistoryPlan = (messages, endIndex) => {
  const plan = [];
  let hasUser = false;
  for (let i = 0; i < endIndex; i += 1) {
    const message = messages[i];
    if (message && message.role === "user") {
      plan.push({ index: i, includeToolCalls: true });
      hasUser = true;
    } else if (
      hasUser &&
      message &&
      message.role === "assistant" &&
      hasTextContent(message)
    ) {
      plan.push({ index: i, includeToolCalls: false });
    }
  }
  return plan;
};
const buildContextPlan = (messages) => {
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex < 0) {
    return [];
  }
  const plan = buildHistoryPlan(messages, lastUserIndex);
  for (let i = lastUserIndex; i < messages.length; i += 1) {
    plan.push({ index: i, includeToolCalls: true });
  }
  return plan;
};
const buildContextMessages = (messages) =>
  buildContextPlan(messages).map(({ index, includeToolCalls }) => {
    const message = messages[index];
    if (includeToolCalls) {
      return message;
    }
    return stripToolCalls(message);
  });
const buildStructuredMessages = ({ systemPrompt, format }) => {
  const output = [];
  if (format === "chat" && systemPrompt) {
    output.push({ role: "system", content: systemPrompt });
  }
  const contextMessages = buildContextMessages(state.messages);
  const { removeToolCallIds, trimToolResponseIds } =
    collectPageReadDedupeSets(contextMessages);
  contextMessages.forEach((msg) => {
    if (msg.role === "tool") {
      const callId = msg.tool_call_id;
      if (!callId) {
        throw new Error("工具响应缺少 tool_call_id");
      }
      if (removeToolCallIds.has(callId)) {
        return;
      }
      const content = getToolOutputContent(msg, trimToolResponseIds);
      if (format === "chat") {
        output.push({ role: "tool", content, tool_call_id: callId });
        return;
      }
      output.push({
        type: "function_call_output",
        call_id: callId,
        output: content,
      });
      return;
    }
    if (
      format === "responses" &&
      msg.role !== "user" &&
      msg.role !== "assistant"
    ) {
      return;
    }
    if (format === "chat") {
      const entry = { role: msg.role };
      if (msg.content) {
        entry.content = msg.content;
      }
      const toolCallEntries = collectToolCallEntries(
        msg.tool_calls,
        removeToolCallIds,
      );
      if (toolCallEntries.length) {
        entry.tool_calls = toolCallEntries.map(toChatToolCallForRequest);
      }
      if (entry.content || entry.tool_calls?.length) {
        output.push(entry);
      }
      return;
    }
    if (msg.content) {
      output.push({ role: msg.role, content: msg.content });
    }
    const toolCallEntries = collectToolCallEntries(
      msg.tool_calls,
      removeToolCallIds,
    );
    toolCallEntries.forEach((entry) => {
      output.push({
        type: "function_call",
        call_id: entry.callId,
        name: entry.name,
        arguments: entry.arguments,
      });
    });
  });
  return output;
};
export const buildChatMessages = (systemPrompt) =>
  buildStructuredMessages({ systemPrompt, format: "chat" });
export const buildResponsesInput = () =>
  buildStructuredMessages({ format: "responses" });
