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
  },
  requireElement = (id: string, label: string): HTMLElement => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`${label}元素未找到`);
    }
    return element;
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
      keyView: requireElement("key-view", "keyView"),
      historyView: requireElement("history-view", "historyView"),
      chatView: requireElement("chat-view", "chatView"),
      topBar: requireElement("top-bar", "topBar"),
      topTitle: requireElement("top-title", "topTitle"),
      bottomBar: requireElement("bottom-bar", "bottomBar"),
      followModeSwitch: requireElement("follow-mode", "followModeSwitch"),
      keyInput: requireElement("api-key-input", "keyInput"),
      baseUrlInput: requireElement("base-url-input", "baseUrlInput"),
      modelInput: requireElement("model-input", "modelInput"),
      apiTypeSelect: requireElement("api-type-select", "apiTypeSelect"),
      languageSelect: requireElement("language-select", "languageSelect"),
      themeSelect: requireElement("theme-select", "themeSelect"),
      themeColorInput: requireElement("theme-color-input", "themeColorInput"),
      themeVariantSelect: requireElement(
        "theme-variant-select",
        "themeVariantSelect",
      ),
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
