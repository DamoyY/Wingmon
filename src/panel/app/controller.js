import {
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
  sendWithPageButton,
  stopButton,
} from "../ui/elements.js";
import { setText } from "../ui/text.js";
import { showKeyView, showChatView } from "../ui/views.js";
import { applyTheme } from "../ui/theme.js";
import { fillSettingsForm } from "../ui/forms.js";
import {
  renderMessages,
  appendAssistantDelta,
  clearChat,
} from "../ui/messages.js";
import { state, addMessage } from "../state/store.js";
import { normalizeTheme } from "../utils/theme.js";
import { createRandomId } from "../utils/ids.js";
import { getActiveTab } from "../services/tabs.js";
import {
  getSettings,
  updateSettings,
  buildSystemPrompt,
} from "../services/settings.js";
import { getToolDefinitions, toolNames } from "../tools/definitions.js";
import { attachToolCallsToAssistant } from "../tools/toolcalls.js";
import {
  buildPageMarkdownToolOutput,
  handleToolCalls,
} from "../tools/runtime.js";
import { requestModel } from "../api/client.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";

let activeAbortController = null;
const setComposerSending = (sending) => {
  sendButton.classList.toggle("hidden", sending);
  sendWithPageButton.classList.toggle("hidden", sending);
  stopButton.classList.toggle("hidden", !sending);
};
const ensureNotAborted = (signal) => {
  if (signal?.aborted) throw new Error("已停止");
};
const stopSending = () => {
  if (!activeAbortController) return;
  activeAbortController.abort();
  setText(statusEl, "已停止");
};

const prefillSharedPage = async () => {
  const activeTab = await getActiveTab();
  if (typeof activeTab.id !== "number") {
    throw new Error("活动标签页缺少 tabId");
  }
  setText(statusEl, "读取页面中…");
  const callId = createRandomId("local");
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
  addMessage({ role: "assistant", content: "", tool_calls: [toolCall] });
  addMessage({
    role: "tool",
    content: output,
    tool_call_id: callId,
    name: toolNames.getPageMarkdown,
  });
};
const handleStreamingResponse = (toolCalls, assistantIndex) => {
  const assistantMessage = state.messages[assistantIndex];
  const hasText = Boolean(assistantMessage?.content?.trim());
  if (toolCalls.length) {
    attachToolCallsToAssistant(toolCalls, assistantIndex);
  }
  if (!hasText && !toolCalls.length) {
    state.messages.splice(assistantIndex, 1);
    renderMessages();
    throw new Error("未收到有效回复");
  }
  renderMessages();
};
const handleNonStreamingResponse = (reply, toolCalls) => {
  if (reply) {
    addMessage({ role: "assistant", content: reply });
    renderMessages();
  }
  if (toolCalls.length) {
    attachToolCallsToAssistant(toolCalls);
    renderMessages();
  }
  if (!reply && !toolCalls.length) throw new Error("未收到有效回复");
};
const sendMessage = async ({ includePage = false } = {}) => {
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
  addMessage({ role: "user", content });
  promptEl.value = "";
  renderMessages();
  state.sending = true;
  const abortController = new AbortController();
  activeAbortController = abortController;
  setComposerSending(true);
  try {
    ensureNotAborted(abortController.signal);
    if (includePage) {
      await prefillSharedPage();
    }
    ensureNotAborted(abortController.signal);
    setText(statusEl, "请求中…");
    let pendingToolCalls = [];
    do {
      ensureNotAborted(abortController.signal);
      let assistantIndex = null;
      const onStreamStart = () => {
        assistantIndex = state.messages.length;
        addMessage({ role: "assistant", content: "" });
        renderMessages();
        setText(statusEl, "回复中…");
      };
      const systemPrompt = await buildSystemPrompt();
      const tools = getToolDefinitions(settings.apiType);
      const { toolCalls, reply, streamed } = await requestModel({
        settings,
        systemPrompt,
        tools,
        onDelta: appendAssistantDelta,
        onStreamStart,
        signal: abortController.signal,
      });
      pendingToolCalls = toolCalls || [];
      if (streamed) {
        handleStreamingResponse(pendingToolCalls, assistantIndex);
      } else {
        handleNonStreamingResponse(reply, pendingToolCalls);
      }
      if (pendingToolCalls.length) {
        await handleToolCalls(pendingToolCalls);
        ensureNotAborted(abortController.signal);
        setText(statusEl, "请求中…");
      }
    } while (pendingToolCalls.length);
    setText(statusEl, "");
  } catch (error) {
    if (error?.name === "AbortError" || error?.message === "已停止") {
      setText(statusEl, "已停止");
      return;
    }
    setText(statusEl, `${error.message}`);
  } finally {
    state.sending = false;
    activeAbortController = null;
    setComposerSending(false);
  }
};
export const bindEvents = () => {
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
  sendWithPageButton.addEventListener("click", () =>
    sendMessage({ includePage: true }),
  );
  stopButton.addEventListener("click", stopSending);
  promptEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  clearButton.addEventListener("click", clearChat);
  themeSelect.addEventListener("change", async () => {
    const theme = applyTheme(themeSelect.value);
    await updateSettings({ theme });
  });
  chrome.tabs.onActivated.addListener(() => {
    refreshSendWithPageButton();
  });
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab?.active) return;
    if (changeInfo.url || changeInfo.status === "complete") {
      refreshSendWithPageButton();
    }
  });
};
