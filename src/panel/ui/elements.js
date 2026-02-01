const ensureDomReady = () => {
  if (document.readyState !== "loading") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
};

const requireElement = (id, label) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`${label}元素未找到`);
  }
  return element;
};

export const elements = {};

let initPromise = null;

export const initElements = async () => {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    await ensureDomReady();
    Object.assign(elements, {
      keyView: requireElement("key-view", "keyView"),
      historyView: requireElement("history-view", "historyView"),
      chatView: requireElement("chat-view", "chatView"),
      topBar: requireElement("top-bar", "topBar"),
      topStatus: requireElement("top-status", "topStatus"),
      bottomBar: requireElement("bottom-bar", "bottomBar"),
      followModeSwitch: requireElement("follow-mode", "followModeSwitch"),
      keyInput: requireElement("api-key-input", "keyInput"),
      baseUrlInput: requireElement("base-url-input", "baseUrlInput"),
      modelInput: requireElement("model-input", "modelInput"),
      apiTypeSelect: requireElement("api-type-select", "apiTypeSelect"),
      languageSelect: requireElement("language-select", "languageSelect"),
      themeSelect: requireElement("theme-select", "themeSelect"),
      themeColorInput: requireElement("theme-color-input", "themeColorInput"),
      keyStatus: requireElement("key-status", "keyStatus"),
      settingsHint: requireElement("settings-hint", "settingsHint"),
      openSettings: requireElement("open-settings", "openSettings"),
      saveKey: requireElement("save-key", "saveKey"),
      cancelSettings: requireElement("cancel-settings", "cancelSettings"),
      messagesEl: requireElement("messages", "messagesEl"),
      emptyState: requireElement("empty-state", "emptyState"),
      promptEl: requireElement("prompt", "promptEl"),
      sendButton: requireElement("send", "sendButton"),
      sendWithPageButton: requireElement(
        "send-with-page",
        "sendWithPageButton",
      ),
      stopButton: requireElement("stop", "stopButton"),
      newChatButton: requireElement("new-chat", "newChatButton"),
      historyButton: requireElement("history", "historyButton"),
      closeHistoryButton: requireElement("close-history", "closeHistoryButton"),
      historyList: requireElement("history-list", "historyList"),
      confirmDialog: requireElement("confirm-dialog", "confirmDialog"),
      confirmMessage: requireElement("confirm-message", "confirmMessage"),
    });
    return elements;
  })();
  return initPromise;
};
