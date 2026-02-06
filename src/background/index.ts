type SidePanelBehaviorOptions = { openPanelOnActionClick: boolean };
type SidePanelOpenOptions = { windowId: number };
type TabLike = { windowId: number | null };
type ChromeMessageSender = { tab: TabLike | null };
type RuntimeResponse = { ok: true } | { error: string };
type RuntimeMessageObject = {
  type: string | null;
  [key: string]: string | number | boolean | null;
};
type RuntimeMessage = RuntimeMessageObject | string | number | boolean | null;
type ContentScriptReadyMessage = RuntimeMessageObject & {
  type: "contentScriptReady";
};
type ChromeMessageListener = (
  message: RuntimeMessage,
  sender: ChromeMessageSender,
  sendResponse: (response: RuntimeResponse) => void,
) => boolean;
type ChromeEvent<TListener extends (...args: never[]) => void> = {
  addListener: (listener: TListener) => void;
};
type ChromeSidePanel = {
  setPanelBehavior:
    | ((options: SidePanelBehaviorOptions) => Promise<void> | void)
    | null;
  open: ((options: SidePanelOpenOptions) => Promise<void> | void) | null;
};
type ChromeRuntime = {
  onMessage: ChromeEvent<ChromeMessageListener>;
  onInstalled: ChromeEvent<() => void>;
};
type ChromeAction = {
  onClicked: ChromeEvent<(tab: TabLike | null) => void>;
};
type ChromeApi = {
  sidePanel: ChromeSidePanel | null;
  runtime: ChromeRuntime;
  action: ChromeAction;
};

declare const chrome: ChromeApi;

const logError = (
    message: string,
    error: Error | string | null = null,
  ): void => {
    if (error !== null) {
      console.error(message, error);
      return;
    }
    console.error(message);
  },
  isRuntimeMessageObject = (
    message: RuntimeMessage,
  ): message is RuntimeMessageObject =>
    message !== null && typeof message === "object" && !Array.isArray(message),
  getMessageType = (message: RuntimeMessage): string | null => {
    if (!isRuntimeMessageObject(message)) {
      return null;
    }
    return typeof message.type === "string" ? message.type : null;
  },
  isContentScriptReadyMessage = (
    message: RuntimeMessage,
  ): message is ContentScriptReadyMessage =>
    getMessageType(message) === "contentScriptReady",
  getTabWindowId = (tab: TabLike | null): number | null => {
    if (!tab || typeof tab.windowId !== "number") {
      return null;
    }
    if (!Number.isInteger(tab.windowId) || tab.windowId < 0) {
      return null;
    }
    return tab.windowId;
  },
  enablePanelBehavior = async (): Promise<void> => {
    if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) {
      logError("sidePanel.setPanelBehavior 不可用");
      return;
    }
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      if (error instanceof Error) {
        logError("设置 side panel 行为失败", error);
        return;
      }
      logError("设置 side panel 行为失败", String(error));
    }
  },
  openPanelForTab = async (tab: TabLike | null): Promise<void> => {
    if (!chrome.sidePanel || !chrome.sidePanel.open) {
      logError("sidePanel.open 不可用");
      return;
    }
    const windowId = getTabWindowId(tab);
    if (windowId === null) {
      logError("未找到有效 windowId");
      return;
    }
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      if (error instanceof Error) {
        logError("打开 side panel 失败", error);
        return;
      }
      logError("打开 side panel 失败", String(error));
    }
  },
  registerContentScriptReadyListener = (): void => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!isContentScriptReadyMessage(message)) {
        return false;
      }
      if (getTabWindowId(sender.tab) === null) {
        logError("未找到消息来源标签页");
        sendResponse({ error: "未找到消息来源标签页" });
        return true;
      }
      sendResponse({ ok: true });
      return true;
    });
  };

void enablePanelBehavior();
chrome.runtime.onInstalled.addListener(() => {
  void enablePanelBehavior();
});
chrome.action.onClicked.addListener((tab) => {
  void openPanelForTab(tab);
});
registerContentScriptReadyListener();
