import { state } from "../state/index.js";
import {
  toolNames,
  parseToolArguments,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  validateGetPageMarkdownArgs,
} from "./definitions.js";

const toChatToolCallForRequest = (entry) => ({
  id: entry.callId,
  type: "function",
  function: { name: entry.name, arguments: entry.arguments },
});
const extractGetPageTabIdFromCall = (call) => {
  const argsText = getToolCallArguments(call);
  let args;
  try {
    args = parseToolArguments(argsText || "{}");
  } catch (error) {
    const message = error?.message || "未知错误";
    throw new Error(`get_page 工具参数解析失败：${message}`);
  }
  const { tabId } = validateGetPageMarkdownArgs(args);
  return tabId;
};
const extractOpenPageTabIdFromOutput = (content) => {
  if (typeof content !== "string") {
    throw new Error("open_page 工具响应必须是字符串");
  }
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("open_page 工具响应不能为空");
  }
  if (!trimmed.startsWith("**成功**")) {
    return null;
  }
  if (trimmed === "**成功**") {
    return null;
  }
  const match = trimmed.match(/TabID:\s*["'“”]?(\d+)["'“”]?/);
  if (!match) {
    throw new Error("open_page 成功响应缺少 TabID");
  }
  const tabId = Number(match[1]);
  if (!Number.isInteger(tabId) || tabId <= 0) {
    throw new Error("open_page 响应 TabID 无效");
  }
  return tabId;
};
const isGetPageSuccessOutput = (content) =>
  typeof content === "string" && content.trim().startsWith("**标题：**");
const collectPageReadDedupeSets = (messages) => {
  const callInfoById = new Map();
  messages.forEach((msg) => {
    if (!Array.isArray(msg.tool_calls)) {
      return;
    }
    msg.tool_calls.forEach((call) => {
      const callId = getToolCallId(call);
      const name = getToolCallName(call);
      if (callInfoById.has(callId)) {
        const existing = callInfoById.get(callId);
        if (existing?.name !== name) {
          throw new Error(`重复的工具调用 ID：${callId}`);
        }
        return;
      }
      const info = { name };
      if (name === toolNames.getPageMarkdown) {
        info.tabId = extractGetPageTabIdFromCall(call);
      }
      callInfoById.set(callId, info);
    });
  });
  const readEvents = [];
  messages.forEach((msg, index) => {
    if (msg.role !== "tool") {
      return;
    }
    const callId = msg.tool_call_id;
    if (!callId) {
      throw new Error("工具响应缺少 tool_call_id");
    }
    const info = callInfoById.get(callId);
    const name = msg.name || info?.name;
    if (!name) {
      throw new Error(`工具响应缺少 name：${callId}`);
    }
    if (name === toolNames.getPageMarkdown) {
      if (!isGetPageSuccessOutput(msg.content)) {
        return;
      }
      const tabId = info?.tabId;
      if (!tabId) {
        throw new Error(`get_page 工具响应缺少 tabId：${callId}`);
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
      });
      return;
    }
    if (name === toolNames.openBrowserPage) {
      const tabId = extractOpenPageTabIdFromOutput(msg.content);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
      });
    }
  });
  const latestByTabId = new Map();
  readEvents.forEach((event) => {
    const existing = latestByTabId.get(event.tabId);
    if (!existing || event.index > existing.index) {
      latestByTabId.set(event.tabId, event);
    }
  });
  const removeToolCallIds = new Set();
  const trimOpenPageResponseIds = new Set();
  readEvents.forEach((event) => {
    const latest = latestByTabId.get(event.tabId);
    if (!latest || latest.callId === event.callId) {
      return;
    }
    if (event.type === toolNames.getPageMarkdown) {
      removeToolCallIds.add(event.callId);
      return;
    }
    if (event.type === toolNames.openBrowserPage) {
      trimOpenPageResponseIds.add(event.callId);
    }
  });
  return { removeToolCallIds, trimOpenPageResponseIds };
};
const getToolOutputContent = (msg, trimOpenPageResponseIds) =>
  trimOpenPageResponseIds.has(msg.tool_call_id) ? "**成功**" : msg.content;
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
  const { removeToolCallIds, trimOpenPageResponseIds } =
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
      const content = getToolOutputContent(msg, trimOpenPageResponseIds);
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
