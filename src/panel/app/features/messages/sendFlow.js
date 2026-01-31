import {
  addMessage,
  setStateValue,
  state,
  touchUpdatedAt,
} from "../../state/index.js";
import { getSettings, saveConversation } from "../../services/index.js";
import { getPromptContent } from "../chat/composerState.js";
import appendSharedPageContext from "./pageContext.js";
import createResponseStream from "./requestCycle.js";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./responseHandlers.js";
import {
  ensureSettingsReady,
  reportSendStatus,
  setSendUiState,
  syncComposerAfterSend,
} from "./sendUi.js";

let activeAbortController = null;

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

export const stopSending = async () => {
  if (!activeAbortController) {
    return;
  }
  activeAbortController.abort();
  reportSendStatus("已停止");
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
    return;
  }
  addMessage({ role: "user", content });
  syncComposerAfterSend();
  setStateValue("sending", true);
  const abortController = new AbortController();
  activeAbortController = abortController;
  setSendUiState(true);
  try {
    await saveCurrentConversation();
    ensureNotAborted(abortController.signal);
    if (includePage) {
      reportSendStatus("读取页面中…");
      await appendSharedPageContext();
    }
    ensureNotAborted(abortController.signal);
    reportSendStatus("请求中…");
    const responseStream = createResponseStream({
      settings,
      signal: abortController.signal,
      onStatus: reportSendStatus,
    });
    const consumeResponses = async () => {
      const { value, done } = await responseStream.next();
      if (done) {
        return;
      }
      if (value.streamed) {
        applyStreamedResponse(value.toolCalls, value.assistantIndex);
      } else {
        applyNonStreamedResponse(value.reply, value.toolCalls);
      }
      await consumeResponses();
    };
    await consumeResponses();
    await saveCurrentConversation();
    reportSendStatus("");
  } catch (error) {
    if (error?.name === "AbortError" || error?.message === "已停止") {
      reportSendStatus("已停止");
      return;
    }
    console.error(error?.message || "请求失败");
  } finally {
    setStateValue("sending", false);
    activeAbortController = null;
    setSendUiState(false);
  }
};

export const sendMessageWithPage = () => sendMessage({ includePage: true });
