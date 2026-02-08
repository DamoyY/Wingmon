import { isInternalUrl, normalizeUrl } from "../shared/index.ts";

type RuntimeResponse = { ok: true } | { error: string };
type RuntimeMessageObject = {
  type: string | null;
  [key: string]: string | number | boolean | null;
};
type ContentScriptReadyMessage = RuntimeMessageObject & {
  type: "contentScriptReady";
};
type BrowserTab = chrome.tabs.Tab;

const contentScriptFilePath = "public/content.bundle.js",
  supportedProtocols = new Set<string>(["http:", "https:"]);

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
    message: unknown,
  ): message is RuntimeMessageObject =>
    message !== null && typeof message === "object" && !Array.isArray(message),
  getMessageType = (message: unknown): string | null => {
    if (!isRuntimeMessageObject(message)) {
      return null;
    }
    return typeof message.type === "string" ? message.type : null;
  },
  isContentScriptReadyMessage = (
    message: unknown,
  ): message is ContentScriptReadyMessage =>
    getMessageType(message) === "contentScriptReady",
  hasValidTabId = (tab: BrowserTab): tab is BrowserTab & { id: number } => {
    if (typeof tab.id !== "number") {
      return false;
    }
    if (!Number.isInteger(tab.id) || tab.id <= 0) {
      return false;
    }
    return true;
  },
  isInjectableTabUrl = (url: string | undefined): boolean => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return false;
    }
    if (isInternalUrl(normalizedUrl)) {
      return false;
    }
    try {
      const parsedUrl = new URL(normalizedUrl);
      return supportedProtocols.has(parsedUrl.protocol);
    } catch (error) {
      if (error instanceof Error) {
        logError(`无法解析标签页 URL: ${normalizedUrl}`, error);
        return false;
      }
      logError(`无法解析标签页 URL: ${normalizedUrl}`, String(error));
      return false;
    }
  },
  isInjectableTab = (tab: BrowserTab): tab is BrowserTab & { id: number } =>
    hasValidTabId(tab) && isInjectableTabUrl(tab.url),
  injectContentScriptToTab = async (tabId: number): Promise<void> => {
    try {
      await chrome.scripting.executeScript({
        files: [contentScriptFilePath],
        target: { tabId },
      });
    } catch (error) {
      if (error instanceof Error) {
        logError(`向标签页 ${String(tabId)} 注入内容脚本失败`, error);
        return;
      }
      logError(`向标签页 ${String(tabId)} 注入内容脚本失败`, String(error));
    }
  },
  injectContentScriptToAllOpenTabs = async (): Promise<void> => {
    let tabs: BrowserTab[] = [];
    try {
      tabs = await chrome.tabs.query({});
    } catch (error) {
      if (error instanceof Error) {
        logError("查询标签页失败，无法注入内容脚本", error);
        return;
      }
      logError("查询标签页失败，无法注入内容脚本", String(error));
      return;
    }
    const injectableTabs = tabs.filter(isInjectableTab);
    await Promise.all(
      injectableTabs.map((tab) => injectContentScriptToTab(tab.id)),
    );
  },
  getTabWindowId = (tab: chrome.tabs.Tab | undefined): number | null => {
    if (typeof tab?.windowId !== "number") {
      return null;
    }
    if (!Number.isInteger(tab.windowId) || tab.windowId < 0) {
      return null;
    }
    return tab.windowId;
  },
  enablePanelBehavior = async (): Promise<void> => {
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
  openPanelForTab = async (tab: chrome.tabs.Tab): Promise<void> => {
    const windowId = getTabWindowId(tab);
    if (windowId === null) {
      logError("未找到有效 windowId");
      return;
    }
    try {
      await chrome.sidePanel.open({ windowId });
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
        sendResponse({
          error: "未找到消息来源标签页",
        } satisfies RuntimeResponse);
        return true;
      }
      sendResponse({ ok: true } satisfies RuntimeResponse);
      return true;
    });
  },
  handleExtensionInstalled = async (
    details: chrome.runtime.InstalledDetails,
  ): Promise<void> => {
    await enablePanelBehavior();
    if (details.reason !== "install" && details.reason !== "update") {
      return;
    }
    await injectContentScriptToAllOpenTabs();
  };

void enablePanelBehavior();
chrome.runtime.onInstalled.addListener((details) => {
  void handleExtensionInstalled(details);
});
chrome.action.onClicked.addListener((tab) => {
  void openPanelForTab(tab);
});
registerContentScriptReadyListener();
