import {
  fillSettingsForm,
  keyStatus,
  promptEl,
  sendButton,
  sendWithPageButton,
  setText,
  showKeyView,
  statusEl,
  stopButton,
} from "../ui/index.js";
import {
  removeMessage,
  addMessage,
  state,
  touchUpdatedAt,
} from "../state/index.js";
import {
  buildSystemPrompt,
  getActiveTab,
  getSettings,
  saveConversation,
} from "../services/index.js";
import {
  buildPageMarkdownToolOutput,
  attachToolCallsToAssistant,
  getToolDefinitions,
  handleToolCalls,
  toolNames,
} from "../tools/index.js";
import { requestModel } from "../api/index.js";
import { createRandomId } from "../utils/index.js";
import {
  renderMessagesView,
  appendAssistantDelta,
} from "./messagePresenter.js";
import { setSendWithPagePromptReady } from "./sendWithPageButton.js";

let activeAbortController = null;

const hasPromptContent = (value) => {
  if (typeof value !== "string") {
    throw new Error("输入内容格式无效");
  }
  return Boolean(value.trim());
};

export const updateComposerButtonsState = () => {
  const hasContent = hasPromptContent(promptEl.value);
  sendButton.disabled = !hasContent;
  setSendWithPagePromptReady(hasContent);
};

export const handlePromptInput = () => {
  updateComposerButtonsState();
};

const setComposerSending = (sending) => {
  sendButton.classList.toggle("hidden", sending);
  sendWithPageButton.classList.toggle("hidden", sending);
  stopButton.classList.toggle("hidden", !sending);
};

const ensureNotAborted = (signal) => {
  if (signal?.aborted) {
    throw new Error("已停止");
  }
};

const saveCurrentConversation = async () => {
  if (!state.messages.length) {
    return;
  }
  touchUpdatedAt();
  await saveConversation(state.conversationId, state.messages, state.updatedAt);
};

const prefillSharedPage = async () => {
  const activeTab = await getActiveTab();
  if (typeof activeTab.id !== "number") {
    throw new Error("活动标签页缺少 TabID");
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
  if (!Number.isInteger(assistantIndex)) {
    throw new Error("流式回复缺少消息索引");
  }
  const assistantMessage = state.messages[assistantIndex];
  const hasText = Boolean(assistantMessage?.content?.trim());
  if (toolCalls.length) {
    attachToolCallsToAssistant(toolCalls, assistantIndex);
  }
  if (!hasText && !toolCalls.length) {
    removeMessage(assistantIndex);
    renderMessagesView();
    throw new Error("未收到有效回复");
  }
  renderMessagesView();
};

const handleNonStreamingResponse = (reply, toolCalls) => {
  if (reply) {
    addMessage({ role: "assistant", content: reply });
    renderMessagesView();
  }
  if (toolCalls.length) {
    attachToolCallsToAssistant(toolCalls);
    renderMessagesView();
  }
  if (!reply && !toolCalls.length) {
    throw new Error("未收到有效回复");
  }
};

export const stopSending = async () => {
  if (!activeAbortController) {
    return;
  }
  activeAbortController.abort();
  setText(statusEl, "已停止");
  await saveCurrentConversation();
};

export const sendMessage = async ({ includePage = false } = {}) => {
  if (state.sending) {
    return;
  }
  const content = promptEl.value.trim();
  if (!content) {
    return;
  }
  const settings = await getSettings();
  if (!settings.apiKey || !settings.baseUrl || !settings.model) {
    showKeyView({ isFirstUse: true });
    fillSettingsForm(settings);
    setText(keyStatus, "请先补全 API Key、Base URL 和模型");
    return;
  }
  addMessage({ role: "user", content });
  promptEl.value = "";
  updateComposerButtonsState();
  renderMessagesView();
  state.sending = true;
  const abortController = new AbortController();
  activeAbortController = abortController;
  setComposerSending(true);
  try {
    await saveCurrentConversation();
    ensureNotAborted(abortController.signal);
    if (includePage) {
      await prefillSharedPage();
    }
    ensureNotAborted(abortController.signal);
    setText(statusEl, "请求中…");
    const runRequestCycle = async () => {
      ensureNotAborted(abortController.signal);
      let assistantIndex = null;
      const onStreamStart = () => {
        assistantIndex = state.messages.length;
        addMessage({ role: "assistant", content: "" });
        renderMessagesView();
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
      const pendingToolCalls = toolCalls || [];
      if (streamed) {
        handleStreamingResponse(pendingToolCalls, assistantIndex);
      } else {
        handleNonStreamingResponse(reply, pendingToolCalls);
      }
      if (!pendingToolCalls.length) {
        return;
      }
      await handleToolCalls(pendingToolCalls);
      ensureNotAborted(abortController.signal);
      setText(statusEl, "请求中…");
      await runRequestCycle();
    };
    await runRequestCycle();
    await saveCurrentConversation();
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

export const sendMessageWithPage = () => sendMessage({ includePage: true });

export const handlePromptKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};
