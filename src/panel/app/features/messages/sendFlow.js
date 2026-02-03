import {
  addMessage,
  removeMessage,
  setStateValue,
  state,
  touchUpdatedAt,
} from "../../../state/index.js";
import { getSettings, saveConversation } from "../../../services/index.js";
import { getPromptContent } from "../chat/composerState.js";
import appendSharedPageContext from "./pageContext.js";
import createResponseStream from "./requestCycle.js";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./responseHandlers.js";
import {
  promptSettingsCompletion,
  reportSendStatus,
  setSendUiState,
  syncComposerAfterSend,
} from "./sendUi.ts";
import ensureSettingsReady from "./settingsValidation.js";

let activeAbortController = null;

const ensureNotAborted = (signal) => {
    if (signal?.aborted) {
      throw new Error("已停止");
    }
  },
  clearPendingAssistant = (assistantIndex) => {
    if (!Number.isInteger(assistantIndex)) {
      return;
    }
    const message = state.messages[assistantIndex];
    if (!message || message.role !== "assistant" || message.pending !== true) {
      return;
    }
    const hasContent =
        typeof message.content === "string" && message.content.trim(),
      hasToolCalls =
        Array.isArray(message.tool_calls) && message.tool_calls.length;
    if (hasContent || hasToolCalls) {
      return;
    }
    removeMessage(assistantIndex);
  },
  saveCurrentConversation = async () => {
    if (!state.messages.length) {
      return;
    }
    touchUpdatedAt();
    await saveConversation(
      state.conversationId,
      state.messages,
      state.updatedAt,
    );
  };

export const stopSending = async () => {
  if (!activeAbortController) {
    return;
  }
  activeAbortController.abort();
  reportSendStatus("");
  await saveCurrentConversation();
};

export const sendMessage = async ({ includePage = false } = {}) => {
  if (state.sending) {
    return;
  }
  const content = getPromptContent();
  if (!content) {
    return;
  }
  const settings = await getSettings();
  if (!ensureSettingsReady(settings)) {
    promptSettingsCompletion(settings);
    return;
  }
  let pendingAssistantIndex = null;
  addMessage({ role: "user", content });
  syncComposerAfterSend();
  addMessage({ role: "assistant", content: "", pending: true });
  pendingAssistantIndex = state.messages.length - 1;
  setStateValue("sending", true);
  const abortController = new AbortController();
  activeAbortController = abortController;
  setSendUiState(true);
  reportSendStatus("");
  try {
    await saveCurrentConversation();
    ensureNotAborted(abortController.signal);
    if (includePage) {
      await appendSharedPageContext();
    }
    ensureNotAborted(abortController.signal);
    const responseStream = createResponseStream({
        settings,
        signal: abortController.signal,
        onStatus: reportSendStatus,
        assistantIndex: pendingAssistantIndex,
      }),
      consumeResponses = async () => {
        const { value, done } = await responseStream.next();
        if (done) {
          return;
        }
        if (value.streamed) {
          applyStreamedResponse(value.toolCalls, value.assistantIndex);
        } else {
          applyNonStreamedResponse(
            value.reply,
            value.toolCalls,
            value.assistantIndex,
          );
        }
        await consumeResponses();
      };
    await consumeResponses();
    await saveCurrentConversation();
    reportSendStatus("");
  } catch (error) {
    if (error?.name === "AbortError" || error?.message === "已停止") {
      clearPendingAssistant(pendingAssistantIndex);
      reportSendStatus("");
      return;
    }
    console.error(error?.message || "请求失败");
    clearPendingAssistant(pendingAssistantIndex);
    reportSendStatus("");
  } finally {
    setStateValue("sending", false);
    activeAbortController = null;
    setSendUiState(false);
  }
};

export const sendMessageWithPage = () => sendMessage({ includePage: true });
