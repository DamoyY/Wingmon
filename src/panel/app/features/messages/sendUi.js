import {
  elements,
  fillSettingsForm,
  setText,
  showKeyView,
} from "../../../ui/index.js";
import { renderMessagesView } from "./presenter.js";
import { clearPromptContent } from "../chat/composerState.js";
import {
  clearPromptInput,
  setComposerSending,
  updateComposerButtonsState,
} from "../chat/composerView.js";

const normalizeStatusMessage = (message) => {
  if (message === undefined || message === null) {
    return "";
  }
  if (typeof message !== "string") {
    throw new Error("状态内容必须为字符串");
  }
  return message;
};

export const reportSendStatus = (message) => {
  const normalizedMessage = normalizeStatusMessage(message);
  if (!elements.topStatus) {
    throw new Error("状态提示元素未初始化");
  }
  setText(elements.topStatus, normalizedMessage);
};

export const promptSettingsCompletion = (settings) => {
  showKeyView({ isFirstUse: true });
  fillSettingsForm(settings);
  if (!elements.keyStatus) {
    throw new Error("状态提示元素未初始化");
  }
  setText(elements.keyStatus, "请先补全 API Key、Base URL 和模型");
};

export const syncComposerAfterSend = () => {
  clearPromptContent();
  clearPromptInput();
  updateComposerButtonsState();
  renderMessagesView();
};

export const setSendUiState = (sending) => {
  setComposerSending(sending);
};
