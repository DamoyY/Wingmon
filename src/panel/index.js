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
import {
  getToolDefinitions,
  buildChatMessages,
  buildResponsesInput,
  addChatToolCallDelta,
  finalizeChatToolCalls,
  addResponsesToolCallEvent,
  finalizeResponsesToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
  attachToolCallsToAssistant,
  handleToolCalls,
  parseJson,
} from "./tools.js";

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
const requestModel = async (settings, systemPrompt) => {
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
  setText(statusEl, "请求中…");
  try {
    const systemPrompt = await buildSystemPrompt();
    let pendingToolCalls = [];
    do {
      const { toolCalls } = await requestModel(settings, systemPrompt);
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
};
const init = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  shareToggle.checked = settings.sharePage;
  applyTheme(settings.theme);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView();
  }
  bindEvents();
};
init();
