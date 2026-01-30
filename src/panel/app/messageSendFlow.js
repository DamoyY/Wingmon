import {
  fillSettingsForm,
  keyStatus,
  setText,
  showKeyView,
} from "../ui/index.js";
import {
  addMessage,
  setStateValue,
  state,
  touchUpdatedAt,
} from "../state/index.js";
import { getSettings, saveConversation } from "../services/index.js";
import { renderMessagesView } from "./messagePresenter.js";
import {
  clearPromptContent,
  getPromptContent,
  setComposerSending,
  updateComposerButtonsState,
} from "./composerState.js";
import appendSharedPageContext from "./messagePageContext.js";
import createResponseStream from "./messageRequestCycle.js";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./messageResponseHandlers.js";

let activeAbortController = null;

const logStatus = (message) => {
  if (message) {
    console.info(message);
    return;
  }
  console.info("");
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

const ensureSettingsReady = (settings) => {
  if (!settings.apiKey || !settings.baseUrl || !settings.model) {
    showKeyView({ isFirstUse: true });
    fillSettingsForm(settings);
    setText(keyStatus, "请先补全 API Key、Base URL 和模型");
    return false;
  }
  return true;
};

export const stopSending = async () => {
  if (!activeAbortController) {
    return;
  }
  activeAbortController.abort();
  logStatus("已停止");
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
  clearPromptContent();
  updateComposerButtonsState();
  renderMessagesView();
  setStateValue("sending", true);
  const abortController = new AbortController();
  activeAbortController = abortController;
  setComposerSending(true);
  try {
    await saveCurrentConversation();
    ensureNotAborted(abortController.signal);
    if (includePage) {
      logStatus("读取页面中…");
      await appendSharedPageContext();
    }
    ensureNotAborted(abortController.signal);
    logStatus("请求中…");
    const responseStream = createResponseStream({
      settings,
      signal: abortController.signal,
      onStatus: logStatus,
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
    logStatus("");
  } catch (error) {
    if (error?.name === "AbortError" || error?.message === "已停止") {
      logStatus("已停止");
      return;
    }
    console.error(error?.message || "请求失败");
  } finally {
    setStateValue("sending", false);
    activeAbortController = null;
    setComposerSending(false);
  }
};

export const sendMessageWithPage = () => sendMessage({ includePage: true });
