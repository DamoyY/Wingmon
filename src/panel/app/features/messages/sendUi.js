import {
  elements,
  fillSettingsForm,
  setText,
  showKeyView,
} from "../../../ui/index.js";
import { renderMessagesView } from "./presenter.js";
import {
  clearPromptContent,
  setComposerSending,
  updateComposerButtonsState,
} from "../chat/composerState.js";

const normalizeStatusMessage = (message) => {
  if (message === undefined || message === null) {
    return "";
  }
  if (typeof message !== "string") {
    throw new Error("状态内容必须为字符串");
  }
  return message;
};

const ensureSettingsPayload = (settings) => {
  if (!settings || typeof settings !== "object") {
    throw new Error("设置信息无效");
  }
  return settings;
};

export const reportSendStatus = (message) => {
  const normalizedMessage = normalizeStatusMessage(message);
  if (!elements.topStatus) {
    throw new Error("状态提示元素未初始化");
  }
  setText(elements.topStatus, normalizedMessage);
};

export const ensureSettingsReady = (settings) => {
  const { apiKey, baseUrl, model } = ensureSettingsPayload(settings);
  if (!apiKey || !baseUrl || !model) {
    showKeyView({ isFirstUse: true });
    fillSettingsForm(settings);
    if (!elements.keyStatus) {
      throw new Error("状态提示元素未初始化");
    }
    setText(elements.keyStatus, "请先补全 API Key、Base URL 和模型");
    return false;
  }
  return true;
};

export const syncComposerAfterSend = () => {
  clearPromptContent();
  updateComposerButtonsState();
  renderMessagesView();
};

export const setSendUiState = (sending) => {
  setComposerSending(sending);
};
