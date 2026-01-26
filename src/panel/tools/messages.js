import { state, addMessage, updateMessage } from "../ui.js";
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
const buildStructuredMessages = ({ systemPrompt, format }) => {
  const output = [];
  if (format === "chat" && systemPrompt) {
    output.push({ role: "system", content: systemPrompt });
  }
  const { removeToolCallIds, trimOpenPageResponseIds } =
    collectPageReadDedupeSets(state.messages);
  state.messages.forEach((msg) => {
    if (msg.role === "tool") {
      const callId = msg.tool_call_id;
      if (!callId) throw new Error("工具响应缺少 tool_call_id");
      if (removeToolCallIds.has(callId)) return;
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
      if (msg.content) entry.content = msg.content;
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
const normalizeToolCall = ({
  id,
  callId,
  name,
  argumentsText,
  defaultArguments,
}) => {
  if (!name) return null;
  const resolvedId = callId || id;
  const resolvedArguments =
    typeof argumentsText === "string" ? argumentsText : defaultArguments;
  return {
    id: resolvedId,
    type: "function",
    function: { name, arguments: resolvedArguments },
    call_id: resolvedId,
  };
};
const normalizeToolCallList = (items, mapper) =>
  items.map((item) => normalizeToolCall(mapper(item))).filter(Boolean);
export const finalizeChatToolCalls = (collector) =>
  normalizeToolCallList(Object.values(collector), (call) => ({
    id: call.id,
    callId: call.call_id,
    name: call.function?.name,
    argumentsText: call.function?.arguments,
  }));
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
  normalizeToolCallList(Object.values(collector), (call) => ({
    id: call.id,
    callId: call.call_id,
    name: call?.name,
    argumentsText: call.arguments,
    defaultArguments: "",
  }));
export const extractChatToolCalls = (data) => {
  const message = data?.choices?.[0]?.message;
  if (!message) return [];
  if (Array.isArray(message.tool_calls)) {
    return normalizeToolCallList(message.tool_calls, (call) => ({
      id: call.id,
      callId: call.call_id,
      name: call.function?.name,
      argumentsText: call.function?.arguments,
    }));
  }
  if (message.function_call) {
    const call = message.function_call;
    return normalizeToolCallList([call], () => ({
      id: message.id || call.name,
      callId: message.id || call.name,
      name: call.name,
      argumentsText: call.arguments,
      defaultArguments: "",
    }));
  }
  return [];
};
export const extractResponsesToolCalls = (data) => {
  const output = Array.isArray(data?.output) ? data.output : [];
  return normalizeToolCallList(
    output.filter((item) => item?.type === "function_call"),
    (item) => ({
      id: item.id,
      callId: item.call_id,
      name: item.name,
      argumentsText: item.arguments,
      defaultArguments: "",
    }),
  );
};
export const attachToolCallsToAssistant = (toolCalls, assistantIndex) => {
  if (!toolCalls.length) return;
  const index =
    typeof assistantIndex === "number" ? assistantIndex : (
      state.messages.length - 1
    );
  const target = state.messages[index];
  if (target && target.role === "assistant") {
    updateMessage(index, { tool_calls: toolCalls });
    return;
  }
  addMessage({ role: "assistant", content: "", tool_calls: toolCalls });
};
