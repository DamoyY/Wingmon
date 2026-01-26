import { setText, statusEl, state } from "./ui.js";

const toolNames = {
  openBrowserPage: "open_page",
  clickElement: "clickElement",
};
const openPageToolSchema = {
  type: "object",
  properties: {
    url: { type: "string", description: "要打开的 URL" },
    focus: { type: "boolean", description: "是否切换浏览器焦点到新页面" },
  },
  required: ["url", "focus"],
  additionalProperties: false,
};
const clickElementToolSchema = {
  type: "object",
  properties: { id: { type: "string", description: "要点击的 botton 的 ID" } },
  required: ["id"],
  additionalProperties: false,
};
export const getToolDefinitions = (apiType) => {
  if (apiType === "responses") {
    return [
      {
        type: "function",
        name: toolNames.openBrowserPage,
        description: "在当前浏览器打开指定网页",
        parameters: openPageToolSchema,
        strict: true,
      },
      {
        type: "function",
        name: toolNames.clickElement,
        description: "点击当前页面上指定的 botton",
        parameters: clickElementToolSchema,
        strict: true,
      },
    ];
  }
  return [
    {
      type: "function",
      function: {
        name: toolNames.openBrowserPage,
        description: "在当前浏览器打开指定网页。",
        parameters: openPageToolSchema,
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: toolNames.clickElement,
        description: "点击当前页面上指定 ID 的元素。",
        parameters: clickElementToolSchema,
        strict: true,
      },
    },
  ];
};
export const parseJson = (text) => {
  if (typeof text !== "string") {
    throw new Error("JSON 输入必须是字符串");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 解析失败：${error.message}`);
  }
};
const parseToolArguments = (text) => {
  return parseJson(text);
};
const normalizeToolCall = (toolCall) => {
  if (!toolCall) return null;
  if (toolCall.function) {
    const id = toolCall.id;
    const name = toolCall.function?.name;
    const args = toolCall.function?.arguments ?? "";
    if (!id || !name) return null;
    return { id, call_id: toolCall.call_id || id, name, arguments: args };
  }
  if (toolCall.name) {
    const callId = toolCall.call_id || toolCall.id;
    if (!callId) return null;
    return {
      id: callId,
      call_id: callId,
      name: toolCall.name,
      arguments: toolCall.arguments ?? "",
    };
  }
  return null;
};
const toChatToolCallForRequest = (call) => ({
  id: call.id,
  type: "function",
  function: {
    name: call.function?.name || call.name,
    arguments: call.function?.arguments ?? call.arguments ?? "",
  },
});
export const buildChatMessages = (systemPrompt) => {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  state.messages.forEach((msg) => {
    if (msg.role === "tool") {
      messages.push({
        role: "tool",
        content: msg.content,
        tool_call_id: msg.tool_call_id,
      });
      return;
    }
    const entry = { role: msg.role };
    if (msg.content) entry.content = msg.content;
    if (msg.tool_calls?.length) {
      entry.tool_calls = msg.tool_calls.map(toChatToolCallForRequest);
    }
    messages.push(entry);
  });
  return messages;
};
export const buildResponsesInput = () => {
  const input = [];
  state.messages.forEach((msg) => {
    if (msg.role === "tool") {
      input.push({
        type: "function_call_output",
        call_id: msg.tool_call_id,
        output: msg.content,
      });
      return;
    }
    if (msg.role === "user" || msg.role === "assistant") {
      if (msg.content) {
        input.push({ role: msg.role, content: msg.content });
      }
      if (msg.tool_calls?.length) {
        msg.tool_calls.forEach((call) => {
          const name = call.function?.name || call.name;
          const callId = call.call_id || call.id;
          if (!name || !callId) return;
          input.push({
            type: "function_call",
            call_id: callId,
            name,
            arguments: call.function?.arguments ?? call.arguments ?? "",
          });
        });
      }
    }
  });
  return input;
};
const createTab = (url, active) =>
  new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法创建标签页";
        reject(new Error(message));
        return;
      }
      if (!tab) {
        reject(new Error("创建标签页失败"));
        return;
      }
      resolve(tab);
    });
  });
const validateOpenPageArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.url !== "string" || !args.url.trim()) {
    throw new Error("url 必须是非空字符串");
  }
  if (typeof args.focus !== "boolean") {
    throw new Error("focus 必须是布尔值");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch (error) {
    throw new Error("url 格式不正确");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("url 仅支持 http 或 https");
  }
  return { url: parsedUrl.toString(), focus: args.focus };
};
const validateClickElementArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.id !== "string" || !args.id.trim()) {
    throw new Error("id 必须是非空字符串");
  }
  return { id: args.id.trim() };
};
const executeOpenBrowserPage = async (args) => {
  const { url, focus } = validateOpenPageArgs(args);
  await createTab(url, focus);
  return "成功";
};
const getActiveTabId = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法查询活动标签页";
        reject(new Error(message));
        return;
      }
      const tabId = tabs?.[0]?.id;
      if (!tabId) {
        reject(new Error("未找到活动标签页"));
        return;
      }
      resolve(tabId);
    });
  });
const sendMessageToTab = (tabId, payload) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法发送消息到页面";
        reject(new Error(message));
        return;
      }
      if (!response) {
        reject(new Error("页面未返回结果"));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
const executeClickElement = async (args) => {
  const { id } = validateClickElementArgs(args);
  const tabId = await getActiveTabId();
  const result = await sendMessageToTab(tabId, { type: "clickElement", id });
  if (!result?.ok) {
    throw new Error("点击元素失败");
  }
  return "成功";
};
const executeToolCall = async (toolCall) => {
  const normalized = normalizeToolCall(toolCall);
  if (!normalized) {
    throw new Error("工具调用格式不正确");
  }
  const args = parseToolArguments(normalized.arguments || "{}");
  if (normalized.name === toolNames.openBrowserPage) {
    return executeOpenBrowserPage(args);
  }
  if (normalized.name === toolNames.clickElement) {
    return executeClickElement(args);
  }
  throw new Error(`未支持的工具：${normalized.name}`);
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
export const handleToolCalls = async (toolCalls) => {
  for (const call of toolCalls) {
    const callId = call.call_id || call.id;
    const name = call.function?.name || call.name;
    if (!callId || !name) {
      throw new Error("工具调用缺少必要字段");
    }
    let output = "成功";
    try {
      output = await executeToolCall(call);
    } catch (error) {
      const message = error?.message || "工具调用失败";
      setText(statusEl, message);
      output = `失败: ${message}`;
    }
    state.messages.push({
      role: "tool",
      content: output,
      tool_call_id: callId,
      name,
      hidden: true,
    });
  }
};
