import { state } from "../ui.js";
import {
  toolNames,
  parseJson,
  getToolCallId,
  getToolCallName,
  validateGetPageMarkdownArgs,
} from "./definitions.js";

const parseToolArguments = (text) => parseJson(text);
const getToolCallArguments = (call) =>
  call.function?.arguments ?? call.arguments ?? "";
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
  const match = trimmed.match(/tabId:\s*["'“”]?(\d+)["'“”]?/);
  if (!match) {
    throw new Error("open_page 成功响应缺少 tabId");
  }
  const tabId = Number(match[1]);
  if (!Number.isInteger(tabId) || tabId <= 0) {
    throw new Error("open_page 响应 tabId 无效");
  }
  return tabId;
};
const isGetPageSuccessOutput = (content) =>
  typeof content === "string" && content.trim().startsWith("**标题：**");
const collectPageReadDedupeSets = (messages) => {
  const callInfoById = new Map();
  messages.forEach((msg) => {
    if (!Array.isArray(msg.tool_calls)) return;
    msg.tool_calls.forEach((call) => {
      const callId = getToolCallId(call);
      const name = getToolCallName(call);
      if (callInfoById.has(callId)) {
        const existing = callInfoById.get(callId);
        if (existing?.name !== name) {
          throw new Error(`重复的工具调用 id：${callId}`);
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
    if (msg.role !== "tool") return;
    const callId = msg.tool_call_id;
    if (!callId) throw new Error("工具响应缺少 tool_call_id");
    const info = callInfoById.get(callId);
    const name = msg.name || info?.name;
    if (!name) {
      throw new Error(`工具响应缺少 name：${callId}`);
    }
    if (name === toolNames.getPageMarkdown) {
      if (!isGetPageSuccessOutput(msg.content)) return;
      const tabId = info?.tabId;
      if (!tabId) {
        throw new Error(`get_page 工具响应缺少 tabId：${callId}`);
      }
      readEvents.push({ tabId, type: name, callId, index });
      return;
    }
    if (name === toolNames.openBrowserPage) {
      const tabId = extractOpenPageTabIdFromOutput(msg.content);
      if (!tabId) return;
      readEvents.push({ tabId, type: name, callId, index });
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
    if (!latest || latest.callId === event.callId) return;
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
  if (!Array.isArray(toolCalls)) return [];
  const entries = [];
  toolCalls.forEach((call) => {
    const callId = getToolCallId(call);
    const name = getToolCallName(call);
    if (removeToolCallIds.has(callId)) return;
    entries.push({ call, callId, name, arguments: getToolCallArguments(call) });
  });
  return entries;
};
export const buildChatMessages = (systemPrompt) => {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  const { removeToolCallIds, trimOpenPageResponseIds } =
    collectPageReadDedupeSets(state.messages);
  state.messages.forEach((msg) => {
    if (msg.role === "tool") {
      const callId = msg.tool_call_id;
      if (!callId) throw new Error("工具响应缺少 tool_call_id");
      if (removeToolCallIds.has(callId)) return;
      const content = getToolOutputContent(msg, trimOpenPageResponseIds);
      messages.push({ role: "tool", content, tool_call_id: callId });
      return;
    }
    const entry = { role: msg.role };
    if (msg.content) entry.content = msg.content;
    const toolCallEntries = collectToolCallEntries(
      msg.tool_calls,
      removeToolCallIds,
    );
    if (toolCallEntries.length) {
      entry.tool_calls = toolCallEntries.map(toChatToolCallForRequest);
    }
    if (entry.content || entry.tool_calls?.length) {
      messages.push(entry);
    }
  });
  return messages;
};
export const buildResponsesInput = () => {
  const input = [];
  const { removeToolCallIds, trimOpenPageResponseIds } =
    collectPageReadDedupeSets(state.messages);
  state.messages.forEach((msg) => {
    if (msg.role === "tool") {
      const callId = msg.tool_call_id;
      if (!callId) throw new Error("工具响应缺少 tool_call_id");
      if (removeToolCallIds.has(callId)) return;
      const output = getToolOutputContent(msg, trimOpenPageResponseIds);
      input.push({ type: "function_call_output", call_id: callId, output });
      return;
    }
    if (msg.role === "user" || msg.role === "assistant") {
      if (msg.content) {
        input.push({ role: msg.role, content: msg.content });
      }
      const toolCallEntries = collectToolCallEntries(
        msg.tool_calls,
        removeToolCallIds,
      );
      toolCallEntries.forEach((entry) => {
        input.push({
          type: "function_call",
          call_id: entry.callId,
          name: entry.name,
          arguments: entry.arguments,
        });
      });
    }
  });
  return input;
};
export const addChatToolCallDelta = (collector, deltas) => {
  deltas.forEach((delta) => {
    const index = typeof delta.index === "number" ? delta.index : 0;
    if (!collector[index]) {
      collector[index] = {
        id: delta.id,
        type: delta.type || "function",
        function: { name: delta.function?.name || "", arguments: "" },
      };
    }
    if (delta.id) collector[index].id = delta.id;
    if (delta.type) collector[index].type = delta.type;
    if (delta.function?.name) {
      collector[index].function.name = delta.function.name;
    }
    if (typeof delta.function?.arguments === "string") {
      collector[index].function.arguments += delta.function.arguments;
    }
  });
};
export const finalizeChatToolCalls = (collector) =>
  Object.values(collector)
    .filter((call) => call.function?.name)
    .map((call) => ({ ...call, call_id: call.call_id || call.id }));
export const addResponsesToolCallEvent = (collector, payload, eventType) => {
  const resolvedType = payload?.type || eventType;
  if (resolvedType === "response.output_item.added") {
    if (payload?.item?.type === "function_call") {
      collector[payload.output_index] = { ...payload.item };
    }
    return;
  }
  if (resolvedType === "response.output_item.done") {
    if (payload?.item?.type === "function_call") {
      collector[payload.output_index] = { ...payload.item };
    }
    return;
  }
  if (resolvedType === "response.function_call_arguments.delta") {
    const index = payload?.output_index;
    if (typeof index !== "number" || !collector[index]) return;
    collector[index].arguments =
      `${collector[index].arguments || ""}${payload.delta || ""}`;
    return;
  }
  if (resolvedType === "response.function_call_arguments.done") {
    const index = payload?.output_index;
    if (typeof index !== "number" || !collector[index]) return;
    if (typeof payload.arguments === "string") {
      collector[index].arguments = payload.arguments;
    }
  }
};
export const finalizeResponsesToolCalls = (collector) =>
  Object.values(collector)
    .filter((call) => call?.name)
    .map((call) => ({
      id: call.call_id || call.id,
      type: "function",
      function: { name: call.name, arguments: call.arguments || "" },
      call_id: call.call_id || call.id,
    }));
export const extractChatToolCalls = (data) => {
  const message = data?.choices?.[0]?.message;
  if (!message) return [];
  if (Array.isArray(message.tool_calls)) {
    return message.tool_calls.map((call) => ({
      ...call,
      call_id: call.call_id || call.id,
    }));
  }
  if (message.function_call) {
    const call = message.function_call;
    return [
      {
        id: message.id || call.name,
        type: "function",
        function: { name: call.name, arguments: call.arguments || "" },
        call_id: message.id || call.name,
      },
    ];
  }
  return [];
};
export const extractResponsesToolCalls = (data) => {
  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .filter((item) => item?.type === "function_call")
    .map((item) => ({
      id: item.call_id || item.id,
      type: "function",
      function: { name: item.name, arguments: item.arguments || "" },
      call_id: item.call_id || item.id,
    }));
};
export const attachToolCallsToAssistant = (toolCalls, assistantIndex) => {
  if (!toolCalls.length) return;
  const index =
    typeof assistantIndex === "number" ? assistantIndex : (
      state.messages.length - 1
    );
  const target = state.messages[index];
  if (target && target.role === "assistant") {
    target.tool_calls = toolCalls;
    if (!target.content) target.hidden = true;
    return;
  }
  state.messages.push({
    role: "assistant",
    content: "",
    tool_calls: toolCalls,
    hidden: true,
  });
};
