type SidePanelBehaviorOptions = { openPanelOnActionClick: boolean };
type SidePanelOpenOptions = { windowId: number };
type TabLike = { windowId?: number };
type ChromeMessageSender = { tab?: TabLike };
type ChromeMessageListener = (
  message: unknown,
  sender: ChromeMessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | undefined;
type ChromeEvent<TListener extends (...args: never[]) => void> = {
  addListener: (listener: TListener) => void;
};
type ChromeSidePanel = {
  setPanelBehavior?: (
    options: SidePanelBehaviorOptions,
  ) => Promise<void> | void;
  open?: (options: SidePanelOpenOptions) => Promise<void> | void;
};
type ChromeRuntime = {
  onMessage: ChromeEvent<ChromeMessageListener>;
  onInstalled: ChromeEvent<() => void>;
};
type ChromeAction = {
  onClicked: ChromeEvent<(tab?: TabLike) => void>;
};
type ChromeApi = {
  sidePanel?: ChromeSidePanel;
  runtime: ChromeRuntime;
  action: ChromeAction;
};

declare const chrome: ChromeApi;

const logError = (message: string, error?: unknown): void => {
    if (error) {
      console.error(message, error);
      return;
    }
    console.error(message);
  },
  enablePanelBehavior = async (): Promise<void> => {
    if (!chrome.sidePanel?.setPanelBehavior) {
      logError("sidePanel.setPanelBehavior 不可用");
      return;
    }
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      logError("设置 side panel 行为失败", error);
    }
  },
  openPanelForTab = async (tab?: TabLike): Promise<void> => {
    if (!chrome.sidePanel?.open) {
      logError("sidePanel.open 不可用");
      return;
    }
    const windowId = tab?.windowId;
    if (typeof windowId !== "number") {
      logError("未找到有效 windowId");
      return;
    }
    try {
      await chrome.sidePanel.open({ windowId });
    } catch (error) {
      logError("打开 side panel 失败", error);
    }
  },
  registerContentScriptReadyListener = (): void => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const payload = (message ?? {}) as { type?: string };
      if (payload.type !== "contentScriptReady") {
        return false;
      }
      if (!sender.tab) {
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
