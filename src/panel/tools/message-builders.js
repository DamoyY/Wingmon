import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
} from "./definitions.ts";
import {
  collectPageReadDedupeSets,
  getToolOutputContent,
} from "./toolMessageContext.ts";

const toChatToolCallForRequest = (entry) => ({
    id: entry.callId,
    type: "function",
    function: { name: entry.name, arguments: entry.arguments },
  }),
  collectToolCallEntries = (toolCalls, removeToolCallIds) => {
    if (!Array.isArray(toolCalls)) {
      return [];
    }
    const entries = [];
    toolCalls.forEach((call) => {
      const callId = getToolCallId(call),
        name = getToolCallName(call);
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
  },
  hasTextContent = (message) =>
    typeof message?.content === "string" && Boolean(message.content.trim()),
  findLastUserMessageIndex = (messages) => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return i;
      }
    }
    return -1;
  },
  stripToolCalls = (message) => {
    if (!message || !Array.isArray(message.tool_calls)) {
      return message;
    }
    const rest = { ...message };
    delete rest.tool_calls;
    return rest;
  },
  buildHistoryPlan = (messages, endIndex) => {
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
  },
  buildContextPlan = (messages) => {
    const lastUserIndex = findLastUserMessageIndex(messages);
    if (lastUserIndex < 0) {
      return [];
    }
    const plan = buildHistoryPlan(messages, lastUserIndex);
    for (let i = lastUserIndex; i < messages.length; i += 1) {
      plan.push({ index: i, includeToolCalls: true });
    }
    return plan;
  },
  buildContextMessages = (messages) =>
    buildContextPlan(messages).map(({ index, includeToolCalls }) => {
      const message = messages[index];
      if (includeToolCalls) {
        return message;
      }
      return stripToolCalls(message);
    }),
  ensureMessages = (messages) => {
    if (!Array.isArray(messages)) {
      throw new Error("messages 必须是数组");
    }
    return messages;
  },
  buildStructuredMessages = ({ systemPrompt, format, messages }) => {
    const output = [];
    if (format === "chat" && systemPrompt) {
      output.push({ role: "system", content: systemPrompt });
    }
    const contextMessages = buildContextMessages(ensureMessages(messages)),
      { removeToolCallIds, trimToolResponseIds } =
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
export const buildChatMessages = (systemPrompt, messages) =>
  buildStructuredMessages({ systemPrompt, format: "chat", messages });
export const buildResponsesInput = (messages) =>
  buildStructuredMessages({ format: "responses", messages });
