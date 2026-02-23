import { ensureOffscreenDocument, startPanelServer } from "../server/index.ts";
import {
  isInternalUrl,
  isOffscreenHeartbeatMessage,
  normalizeUrl,
} from "../shared/index.ts";

type RuntimeResponse = { ok: true } | { error: string };
type RuntimeMessageObject = {
  type: string | null;
  [key: string]: string | number | boolean | null;
};
type ContentScriptReadyMessage = RuntimeMessageObject & {
  type: "contentScriptReady";
};
type BrowserTab = chrome.tabs.Tab;
type LooseRecord = Record<string, unknown>;
type HtmlPreviewEntry = { code: string; createdAt: number };
type HtmlPreviewStoragePayload = Record<string, LooseRecord | undefined>;
type ContextMenuUpdateProperties = Omit<
  chrome.contextMenus.CreateProperties,
  "id"
>;

const contentScriptFilePath = "content.bundle.js",
  supportedProtocols = new Set<string>(["http:", "https:"]),
  htmlPreviewStorageKey = "html_previews",
  showHtmlContextMenuId = "show-html-download-page",
  showHtmlContextMenuTitle = "下载页面",
  showHtmlDownloadFilename = "wingmon_generation.html",
  showHtmlPageUrl = chrome.runtime.getURL("show-html.html"),
  showHtmlContextMenuProperties: ContextMenuUpdateProperties = {
    contexts: ["all"],
    title: showHtmlContextMenuTitle,
    visible: false,
  },
  pdfContentDispositionRuleId = 1001,
  pdfContentDispositionRule: chrome.declarativeNetRequest.Rule = {
    action: {
      responseHeaders: [{ header: "content-disposition", operation: "remove" }],
      type: "modifyHeaders",
    },
    condition: {
      resourceTypes: ["main_frame", "sub_frame"],
      urlFilter: ".pdf",
    },
    id: pdfContentDispositionRuleId,
    priority: 1,
  };

const logError = (message: string, error: unknown = null): void => {
    if (error !== null) {
      console.error(message, error);
      return;
    }
    console.error(message);
  },
  isTabNotFoundRuntimeError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }
    return /No tab with id:/i.test(error.message);
  },
  isRuntimeMessageObject = (
    message: unknown,
  ): message is RuntimeMessageObject =>
    message !== null && typeof message === "object" && !Array.isArray(message),
  isLooseRecord = (value: unknown): value is LooseRecord =>
    value !== null && typeof value === "object" && !Array.isArray(value),
  isHtmlPreviewEntry = (entry: unknown): entry is HtmlPreviewEntry => {
    if (!isLooseRecord(entry)) {
      return false;
    }
    if (typeof entry.code !== "string") {
      return false;
    }
    if (typeof entry.createdAt !== "number") {
      return false;
    }
    return Number.isFinite(entry.createdAt);
  },
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
  getShowHtmlPreviewId = (url: string | undefined): string | null => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return null;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch (error) {
      logError(`无法解析右键菜单页面 URL: ${normalizedUrl}`, error);
      return null;
    }
    if (!parsedUrl.href.startsWith(showHtmlPageUrl)) {
      return null;
    }
    const previewId = parsedUrl.searchParams.get("id");
    if (typeof previewId !== "string" || !previewId.trim()) {
      logError(`show-html 页面缺少预览 id: ${normalizedUrl}`);
      return null;
    }
    return previewId;
  },
  getHtmlPreviewCode = async (previewId: string): Promise<string | null> => {
    let result: HtmlPreviewStoragePayload;
    try {
      result = await chrome.storage.local.get<HtmlPreviewStoragePayload>(
        htmlPreviewStorageKey,
      );
    } catch (error) {
      logError("读取 HTML 预览存储失败", error);
      return null;
    }
    const entries = result[htmlPreviewStorageKey];
    if (entries === undefined) {
      logError("HTML 预览存储为空");
      return null;
    }
    if (!isLooseRecord(entries)) {
      logError("HTML 预览存储格式无效", entries);
      return null;
    }
    const entry = entries[previewId];
    if (!isHtmlPreviewEntry(entry)) {
      logError(`HTML 预览记录不存在或格式无效: ${previewId}`, entry ?? null);
      return null;
    }
    return entry.code;
  },
  downloadShowHtmlPreview = async (previewId: string): Promise<void> => {
    const code = await getHtmlPreviewCode(previewId);
    if (code === null) {
      return;
    }
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(code)}`;
    try {
      await chrome.downloads.download({
        filename: showHtmlDownloadFilename,
        url,
      });
    } catch (error) {
      logError("下载 HTML 页面失败", error);
    }
  },
  setShowHtmlContextMenuVisibility = async (
    visible: boolean,
  ): Promise<void> => {
    try {
      await chrome.contextMenus.update(showHtmlContextMenuId, { visible });
    } catch (error) {
      logError("更新 show-html 右键菜单可见性失败", error);
    }
  },
  syncShowHtmlContextMenuVisibilityByTab = async (
    tab: chrome.tabs.Tab | undefined,
  ): Promise<void> => {
    const visible = getShowHtmlPreviewId(tab?.url) !== null;
    await setShowHtmlContextMenuVisibility(visible);
  },
  syncShowHtmlContextMenuVisibilityByTabId = async (
    tabId: number,
  ): Promise<void> => {
    let tab: chrome.tabs.Tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch (error) {
      if (isTabNotFoundRuntimeError(error)) {
        console.info(
          `标签页已关闭，改为按当前活动标签页更新菜单可见性: ${String(tabId)}`,
        );
        await syncShowHtmlContextMenuVisibilityByActiveTab();
        return;
      }
      logError(`读取标签页失败，无法更新菜单可见性: ${String(tabId)}`, error);
      return;
    }
    await syncShowHtmlContextMenuVisibilityByTab(tab);
  },
  syncShowHtmlContextMenuVisibilityByActiveTab = async (): Promise<void> => {
    let tabs: chrome.tabs.Tab[];
    try {
      tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    } catch (error) {
      logError("查询活动标签页失败，无法更新菜单可见性", error);
      return;
    }
    await syncShowHtmlContextMenuVisibilityByTab(tabs[0]);
  },
  createOrUpdateShowHtmlContextMenu = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      chrome.contextMenus.create(
        { ...showHtmlContextMenuProperties, id: showHtmlContextMenuId },
        () => {
          const runtimeError = chrome.runtime.lastError;
          if (!runtimeError) {
            resolve();
            return;
          }
          if (!runtimeError.message.toLowerCase().includes("duplicate id")) {
            logError("创建 show-html 右键菜单失败", runtimeError.message);
            resolve();
            return;
          }
          void chrome.contextMenus
            .update(showHtmlContextMenuId, showHtmlContextMenuProperties)
            .catch((error: unknown) => {
              logError("更新 show-html 右键菜单失败", error);
            })
            .finally(() => {
              resolve();
            });
        },
      );
    });
  },
  registerShowHtmlContextMenu = async (): Promise<void> => {
    await createOrUpdateShowHtmlContextMenu();
    await syncShowHtmlContextMenuVisibilityByActiveTab();
  },
  handleShowHtmlContextMenuClick = async (
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab | undefined,
  ): Promise<void> => {
    if (info.menuItemId !== showHtmlContextMenuId) {
      return;
    }
    const previewId =
      getShowHtmlPreviewId(tab?.url) ??
      getShowHtmlPreviewId(info.pageUrl) ??
      getShowHtmlPreviewId(info.frameUrl);
    if (previewId === null) {
      logError("右键菜单未找到可下载的 HTML 预览");
      return;
    }
    await downloadShowHtmlPreview(previewId);
  },
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
      if (isOffscreenHeartbeatMessage(message)) {
        sendResponse({ ok: true } satisfies RuntimeResponse);
        return true;
      }
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
  registerShowHtmlContextMenuClickListener = (): void => {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      void handleShowHtmlContextMenuClick(info, tab);
    });
  },
  registerShowHtmlContextMenuVisibilityListeners = (): void => {
    chrome.tabs.onActivated.addListener((activeInfo) => {
      void syncShowHtmlContextMenuVisibilityByTabId(activeInfo.tabId);
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (!tab.active) {
        return;
      }
      if (
        typeof changeInfo.url !== "string" &&
        changeInfo.status !== "complete"
      ) {
        return;
      }
      void syncShowHtmlContextMenuVisibilityByTabId(tabId);
    });
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }
      void syncShowHtmlContextMenuVisibilityByActiveTab();
    });
  },
  ensurePdfContentDispositionRule = async (): Promise<void> => {
    try {
      const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules(),
        removeRuleIds = dynamicRules
          .map((rule) => rule.id)
          .filter((ruleId) => ruleId === pdfContentDispositionRuleId);
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [pdfContentDispositionRule],
        removeRuleIds,
      });
    } catch (error) {
      logError("配置 PDF 响应头规则失败", error);
    }
  },
  handleExtensionInstalled = async (
    details: chrome.runtime.InstalledDetails,
  ): Promise<void> => {
    await enablePanelBehavior();
    await registerShowHtmlContextMenu();
    await ensurePdfContentDispositionRule();
    await ensureOffscreenDocument();
    if (details.reason !== "install" && details.reason !== "update") {
      return;
    }
    await injectContentScriptToAllOpenTabs();
  };

void enablePanelBehavior();
void registerShowHtmlContextMenu();
void ensurePdfContentDispositionRule();
void ensureOffscreenDocument();
void startPanelServer();
chrome.runtime.onInstalled.addListener((details) => {
  void handleExtensionInstalled(details);
});
chrome.runtime.onStartup.addListener(() => {
  void ensurePdfContentDispositionRule();
  void ensureOffscreenDocument();
  void startPanelServer();
});
chrome.action.onClicked.addListener((tab) => {
  void openPanelForTab(tab);
});
registerShowHtmlContextMenuClickListener();
registerShowHtmlContextMenuVisibilityListeners();
registerContentScriptReadyListener();
