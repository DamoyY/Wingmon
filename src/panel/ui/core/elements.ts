import { requireElementById } from "../../utils/index.ts";

const ensureDomReady = (): Promise<void> => {
  if (document.readyState !== "loading") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        resolve();
      },
      {
        once: true,
      },
    );
  });
};

export const elements: Record<string, HTMLElement> = {};

let initPromise: Promise<Record<string, HTMLElement>> | null = null;

export const initElements = async (): Promise<Record<string, HTMLElement>> => {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    await ensureDomReady();
    Object.assign(elements, {
      keyView: requireElementById("key-view", "keyView"),
      historyView: requireElementById("history-view", "historyView"),
      chatView: requireElementById("chat-view", "chatView"),
      topBar: requireElementById("top-bar", "topBar"),
      topTitle: requireElementById("top-title", "topTitle"),
      bottomBar: requireElementById("bottom-bar", "bottomBar"),
      followModeSwitch: requireElementById("follow-mode", "followModeSwitch"),
      keyInput: requireElementById("api-key-input", "keyInput"),
      baseUrlInput: requireElementById("base-url-input", "baseUrlInput"),
      modelInput: requireElementById("model-input", "modelInput"),
      apiTypeSelect: requireElementById("api-type-select", "apiTypeSelect"),
      languageSelect: requireElementById("language-select", "languageSelect"),
      themeSelect: requireElementById("theme-select", "themeSelect"),
      themeColorInput: requireElementById(
        "theme-color-input",
        "themeColorInput",
      ),
      themeVariantSelect: requireElementById(
        "theme-variant-select",
        "themeVariantSelect",
      ),
      keyStatus: requireElementById("key-status", "keyStatus"),
      settingsHint: requireElementById("settings-hint", "settingsHint"),
      openSettings: requireElementById("open-settings", "openSettings"),
      saveKey: requireElementById("save-key", "saveKey"),
      cancelSettings: requireElementById("cancel-settings", "cancelSettings"),
      messagesEl: requireElementById("messages", "messagesEl"),
      emptyState: requireElementById("empty-state", "emptyState"),
      promptEl: requireElementById("prompt", "promptEl"),
      sendButton: requireElementById("send", "sendButton"),
      sendWithPageButton: requireElementById(
        "send-with-page",
        "sendWithPageButton",
      ),
      stopButton: requireElementById("stop", "stopButton"),
      newChatButton: requireElementById("new-chat", "newChatButton"),
      historyButton: requireElementById("history", "historyButton"),
      closeHistoryButton: requireElementById(
        "close-history",
        "closeHistoryButton",
      ),
      historyList: requireElementById("history-list", "historyList"),
      confirmDialog: requireElementById("confirm-dialog", "confirmDialog"),
      confirmMessage: requireElementById("confirm-message", "confirmMessage"),
    });
    return elements;
  })();
  return initPromise;
};
