import {
  state,
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
  keyStatus,
  openSettings,
  saveKey,
  cancelSettings,
  promptEl,
  sendButton,
  clearButton,
  statusEl,
  shareToggle,
  setText,
  normalizeTheme,
  showKeyView,
  showChatView,
  applyTheme,
  renderMessages,
  appendAssistantDelta,
  clearChat,
} from "./ui.js";
import {
  getSettings,
  updateSettings,
  fillSettingsForm,
  buildEndpoint,
  buildSystemPrompt,
} from "./settings.js";
import { getToolDefinitions, parseJson, toolNames } from "./tools/definitions.js";
import {
  buildChatMessages,
  buildResponsesInput,
  addChatToolCallDelta,
  finalizeChatToolCalls,
  addResponsesToolCallEvent,
  finalizeResponsesToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
  attachToolCallsToAssistant,
} from "./tools/messages.js";
import {
  handleToolCalls,
  buildPageMarkdownToolOutput,
} from "./tools/runtime.js";

const normalizeTabUrl = (url) => (url || "").trim().toLowerCase();
const isNewTabUrl = (url) => {
  const normalized = normalizeTabUrl(url);
  return (
    normalized === "chrome://newtab/" ||
    normalized === "chrome://new-tab-page/" ||
    normalized === "chrome://new-tab-page"
  );
};
const isChromeInternalUrl = (url) =>
  normalizeTabUrl(url).startsWith("chrome://");
const getActiveTab = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法查询活动标签页";
        reject(new Error(message));
        return;
      }
      const tab = tabs?.[0];
      if (!tab) {
        reject(new Error("未找到活动标签页"));
        return;
      }
      resolve(tab);
    });
  });
const disableShareToggle = (reason) => {
  shareToggle.checked = false;
  shareToggle.disabled = true;
  shareToggle.title = reason || "当前标签页不支持共享";
};
const enableShareToggle = (settings) => {
  shareToggle.disabled = false;
  shareToggle.title = "";
  shareToggle.checked = settings.sharePage;
};
const updateShareToggleAvailability = async (settings) => {
  const activeTab = await getActiveTab();
  if (!activeTab.url) {
    throw new Error("活动标签页缺少 URL");
  }
  const normalizedUrl = normalizeTabUrl(activeTab.url);
  if (isNewTabUrl(normalizedUrl)) {
    disableShareToggle("新标签页不支持共享");
    return;
  }
  if (isChromeInternalUrl(normalizedUrl)) {
    disableShareToggle("Chrome:// 页面不支持共享");
    return;
  }
  const resolvedSettings = settings || (await getSettings());
  enableShareToggle(resolvedSettings);
};
const refreshShareToggle = async (settings) => {
  try {
    await updateShareToggleAvailability(settings);
  } catch (error) {
    const message = error?.message || "无法读取活动标签页";
    disableShareToggle(message);
    setText(statusEl, message);
  }
};

const streamSse = async (response, onPayload) => {
  if (!response.body) throw new Error("无法读取流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentEvent = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        currentEvent = "";
        continue;
      }
      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.replace(/^event:\s*/, "").trim();
        continue;
      }
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.replace(/^data:\s*/, "");
      if (data === "[DONE]") return;
      const payload = parseJson(data);
      if (!payload) continue;
      if (payload?.error?.message) throw new Error(payload.error.message);
      onPayload(payload, currentEvent);
      currentEvent = "";
    }
  }
};
const deltaFromChat = (payload) =>
  payload?.choices?.[0]?.delta?.content ||
  payload?.choices?.[0]?.text ||
  payload?.choices?.[0]?.message?.content ||
  "";
const deltaFromResponses = (payload, eventType) => {
  const resolvedType = payload?.type || eventType;
  if (resolvedType === "response.output_text.delta") {
    return payload?.delta || payload?.text || "";
  }
  if (resolvedType === "response.refusal.delta") {
    return payload?.delta || "";
  }
  return deltaFromChat(payload);
};
const streamChatCompletion = (response, { onDelta, onToolCallDelta }) =>
  streamSse(response, (payload) => {
    const delta = deltaFromChat(payload);
    if (delta) onDelta(delta);
    const toolCalls = payload?.choices?.[0]?.delta?.tool_calls;
    if (Array.isArray(toolCalls) && onToolCallDelta) {
      onToolCallDelta(toolCalls);
    }
  });
const streamResponses = (response, { onDelta, onToolCallEvent }) =>
  streamSse(response, (payload, eventType) => {
    const delta = deltaFromResponses(payload, eventType);
    if (delta) onDelta(delta);
    if (onToolCallEvent) onToolCallEvent(payload, eventType);
  });
const extractResponsesText = (data) => {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const output = Array.isArray(data?.output) ? data.output : [];
  const texts = [];
  output.forEach((item) => {
    if (item?.type !== "message" || !Array.isArray(item.content)) return;
    item.content.forEach((part) => {
      if (part?.type === "output_text" && typeof part.text === "string") {
        texts.push(part.text);
      }
    });
  });
  return texts.join("").trim();
};
const requestModel = async (settings) => {
  const systemPrompt = await buildSystemPrompt();
  const tools = getToolDefinitions(settings.apiType);
  const requestBody =
    settings.apiType === "responses" ?
      {
        model: settings.model,
        input: buildResponsesInput(),
        stream: true,
        tools,
        ...(systemPrompt ? { instructions: systemPrompt } : {}),
      }
    : {
        model: settings.model,
        messages: buildChatMessages(systemPrompt),
        stream: true,
        tools,
      };
  const response = await fetch(
    buildEndpoint(settings.baseUrl, settings.apiType),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "请求失败");
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const assistantIndex = state.messages.length;
    state.messages.push({ role: "assistant", content: "" });
    renderMessages();
    setText(statusEl, "回复中…");
    let toolCalls = [];
    if (settings.apiType === "responses") {
      const collector = {};
      await streamResponses(response, {
        onDelta: appendAssistantDelta,
        onToolCallEvent: (payload, eventType) =>
          addResponsesToolCallEvent(collector, payload, eventType),
      });
      toolCalls = finalizeResponsesToolCalls(collector);
    } else {
      const collector = {};
      await streamChatCompletion(response, {
        onDelta: appendAssistantDelta,
        onToolCallDelta: (deltas) => addChatToolCallDelta(collector, deltas),
      });
      toolCalls = finalizeChatToolCalls(collector);
    }
    const assistantMessage = state.messages[assistantIndex];
    const hasText = Boolean(assistantMessage?.content?.trim());
    if (toolCalls.length) {
      attachToolCallsToAssistant(toolCalls, assistantIndex);
    }
    if (!hasText && toolCalls.length) {
      assistantMessage.hidden = true;
    }
    if (!hasText && !toolCalls.length) {
      state.messages.splice(assistantIndex, 1);
      renderMessages();
      throw new Error("未收到有效回复");
    }
    renderMessages();
    return { toolCalls };
  }
  const data = await response.json();
  const toolCalls =
    settings.apiType === "responses" ?
      extractResponsesToolCalls(data)
    : extractChatToolCalls(data);
  const reply =
    settings.apiType === "responses" ?
      extractResponsesText(data)
    : data?.choices?.[0]?.message?.content?.trim();
  if (reply) {
    state.messages.push({ role: "assistant", content: reply });
    renderMessages();
  }
  if (toolCalls.length) {
    attachToolCallsToAssistant(toolCalls);
    renderMessages();
  }
  if (!reply && !toolCalls.length) throw new Error("未收到有效回复");
  return { toolCalls };
};
const createToolCallId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
const prefillSharedPage = async () => {
  if (!shareToggle.checked) return;
  const activeTab = await getActiveTab();
  if (typeof activeTab.id !== "number") {
    throw new Error("活动标签页缺少 tabId");
  }
  setText(statusEl, "读取页面中…");
  const callId = createToolCallId();
  const args = { tabId: activeTab.id };
  const output = await buildPageMarkdownToolOutput(activeTab.id);
  const toolCall = {
    id: callId,
    type: "function",
    function: {
      name: toolNames.getPageMarkdown,
      arguments: JSON.stringify(args),
    },
    call_id: callId,
  };
  state.messages.push({
    role: "assistant",
    content: "",
    tool_calls: [toolCall],
    hidden: true,
  });
  state.messages.push({
    role: "tool",
    content: output,
    tool_call_id: callId,
    name: toolNames.getPageMarkdown,
    hidden: true,
  });
};
const sendMessage = async () => {
  if (state.sending) return;
  const content = promptEl.value.trim();
  if (!content) return;
  const settings = await getSettings();
  if (!settings.apiKey || !settings.baseUrl || !settings.model) {
    showKeyView();
    fillSettingsForm(settings);
    setText(keyStatus, "请先补全 API Key、Base URL 和模型");
    return;
  }
  state.messages.push({ role: "user", content });
  promptEl.value = "";
  renderMessages();
  state.sending = true;
  try {
    await prefillSharedPage();
    setText(statusEl, "请求中…");
    let pendingToolCalls = [];
    do {
      const { toolCalls } = await requestModel(settings);
      pendingToolCalls = toolCalls || [];
      if (pendingToolCalls.length) {
        await handleToolCalls(pendingToolCalls);
        setText(statusEl, "请求中…");
      }
    } while (pendingToolCalls.length);
    setText(statusEl, "");
  } catch (error) {
    setText(statusEl, `${error.message}`);
  } finally {
    state.sending = false;
  }
};
const bindEvents = () => {
  saveKey.addEventListener("click", async () => {
    const apiKey = keyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim();
    const model = modelInput.value.trim();
    const apiType = apiTypeSelect.value;
    if (!apiKey || !baseUrl || !model) {
      setText(keyStatus, "API Key、Base URL 和模型不能为空");
      return;
    }
    const next = await updateSettings({
      apiKey,
      baseUrl,
      model,
      apiType,
      theme: normalizeTheme(themeSelect.value),
    });
    applyTheme(next.theme);
    showChatView();
  });
  cancelSettings.addEventListener("click", async () => {
    const settings = await getSettings();
    fillSettingsForm(settings);
    setText(keyStatus, "");
    applyTheme(settings.theme);
    if (settings.apiKey && settings.baseUrl && settings.model) showChatView();
  });
  openSettings.addEventListener("click", async () => {
    const settings = await getSettings();
    showKeyView();
    fillSettingsForm(settings);
  });
  sendButton.addEventListener("click", sendMessage);
  promptEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  clearButton.addEventListener("click", clearChat);
  shareToggle.addEventListener("change", async () => {
    await updateSettings({ sharePage: shareToggle.checked });
  });
  themeSelect.addEventListener("change", async () => {
    const theme = applyTheme(themeSelect.value);
    await updateSettings({ theme });
  });
  chrome.tabs.onActivated.addListener(() => {
    refreshShareToggle();
  });
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab?.active) return;
    if (changeInfo.url || changeInfo.status === "complete") {
      refreshShareToggle();
    }
  });
};
const init = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView();
  }
  bindEvents();
  await refreshShareToggle(settings);
};
init();
