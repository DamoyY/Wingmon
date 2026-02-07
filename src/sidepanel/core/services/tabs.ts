import { isInternalUrl } from "../../lib/utils/index.ts";
import type {
  ContentScriptRequest,
  ContentScriptResponseByRequest,
} from "../../../shared/index.ts";

export type BrowserTab = {
  id?: number;
  status?: string;
  title?: string;
  url?: string;
  windowId?: number;
};

export type CreatedBrowserTab = BrowserTab & {
  id: number;
};

type ChromeTabChangeInfo = {
  status?: string;
};

type ChromeTabsApi = {
  get(tabId: number): Promise<BrowserTab | undefined>;
  get(
    tabId: number,
    callback: (currentTab: BrowserTab | undefined) => void,
  ): void;
  query(queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }): Promise<BrowserTab[]>;
  query(
    queryInfo: { active?: boolean; currentWindow?: boolean },
    callback: (tabs: BrowserTab[]) => void,
  ): void;
  create(createProperties: {
    url: string;
    active: boolean;
  }): Promise<BrowserTab | undefined>;
  create(
    createProperties: { url: string; active: boolean },
    callback: (tab: BrowserTab | undefined) => void,
  ): void;
  remove(tabId: number): Promise<void>;
  remove(tabId: number, callback: () => void): void;
  update(
    tabId: number,
    updateProperties: { active: boolean },
  ): Promise<BrowserTab | undefined>;
  update(
    tabId: number,
    updateProperties: { active: boolean },
    callback: () => void,
  ): void;
  sendMessage<TRequest extends ContentScriptRequest>(
    tabId: number,
    payload: TRequest,
  ): Promise<ContentScriptResponseByRequest<TRequest> | null | undefined>;
  sendMessage<TRequest extends ContentScriptRequest>(
    tabId: number,
    payload: TRequest,
    callback: (
      response: ContentScriptResponseByRequest<TRequest> | null | undefined,
    ) => void,
  ): void;
  onUpdated: {
    addListener: (
      callback: (tabId: number, changeInfo: ChromeTabChangeInfo) => void,
    ) => void;
  };
};

type ChromeWindowsApi = {
  update(
    windowId: number,
    updateProperties: { focused: boolean },
  ): Promise<void>;
  update(
    windowId: number,
    updateProperties: { focused: boolean },
    callback: () => void,
  ): void;
};

declare const chrome: {
  tabs: ChromeTabsApi;
  windows: ChromeWindowsApi;
};

type PendingWaiter = {
  resolve: (isComplete: boolean) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

const pendingWaits: Map<number, Set<PendingWaiter>> = new Map();
let listenersReady = false;

const internalTabMessage = "浏览器内置页面不支持连接内容脚本",
  normalizeError = (error: unknown, fallback: string): Error => {
    if (error instanceof Error) {
      if (error.message.trim()) {
        return error;
      }
      return new Error(fallback);
    }
    return new Error(fallback);
  },
  logAndNormalizeError = (error: unknown, fallback: string): Error => {
    const failure = normalizeError(error, fallback);
    console.error(failure.message);
    return failure;
  },
  resolvePendingWaits = (tabId: number, isComplete: boolean): void => {
    const waiters = pendingWaits.get(tabId);
    if (!waiters) {
      return;
    }
    waiters.forEach((waiter) => {
      clearTimeout(waiter.timeoutId);
      waiter.resolve(isComplete);
    });
    pendingWaits.delete(tabId);
  },
  getTabSnapshot = async (tabId: number): Promise<BrowserTab> => {
    try {
      const currentTab = await chrome.tabs.get(tabId);
      if (!currentTab) {
        throw new Error("未找到标签页");
      }
      return currentTab;
    } catch (error) {
      throw logAndNormalizeError(error, "无法获取标签页状态");
    }
  },
  ensureTabConnectable = async (tabId: number): Promise<BrowserTab> => {
    const tab = await getTabSnapshot(tabId);
    if (isInternalUrl(tab.url || "")) {
      const error = new Error(internalTabMessage);
      console.error(error.message);
      throw error;
    }
    return tab;
  },
  registerContentScriptListeners = (): void => {
    if (listenersReady) {
      return;
    }
    listenersReady = true;
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === "complete") {
        resolvePendingWaits(tabId, true);
      }
    });
  },
  resolveResponseErrorMessage = <TRequest extends ContentScriptRequest>(
    response: ContentScriptResponseByRequest<TRequest>,
  ): string | null => {
    if (
      "error" in response &&
      typeof response.error === "string" &&
      response.error.trim()
    ) {
      return response.error;
    }
    return null;
  };

export const initTabListeners = (): void => {
  registerContentScriptListeners();
};

export const getActiveTab = async (): Promise<BrowserTab> => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) {
      throw new Error("未找到活动标签页");
    }
    return tabs[0];
  } catch (error) {
    throw logAndNormalizeError(error, "无法查询活动标签页");
  }
};

export const getAllTabs = async (): Promise<BrowserTab[]> => {
  try {
    return await chrome.tabs.query({});
  } catch (error) {
    throw logAndNormalizeError(error, "无法查询所有标签页");
  }
};

export const createTab = async (
  url: string,
  active: boolean,
): Promise<CreatedBrowserTab> => {
  try {
    const tab = await chrome.tabs.create({ url, active });
    if (!tab) {
      throw new Error("创建标签页失败");
    }
    if (typeof tab.id !== "number") {
      throw new Error("创建标签页失败：缺少 Tab ID");
    }
    return { ...tab, id: tab.id };
  } catch (error) {
    throw logAndNormalizeError(error, "无法创建标签页");
  }
};

export const closeTab = async (tabId: number): Promise<void> => {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    throw logAndNormalizeError(error, "无法关闭标签页");
  }
};

export const focusTab = async (tabId: number): Promise<void> => {
  if (typeof tabId !== "number") {
    const error = new Error("Tab ID 必须是数字");
    console.error(error.message);
    throw error;
  }
  let tab: BrowserTab | undefined;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    throw logAndNormalizeError(error, "无法获取标签页");
  }
  if (!tab) {
    const error = new Error("未找到标签页");
    console.error(error.message);
    throw error;
  }
  if (typeof tab.windowId !== "number") {
    const error = new Error("标签页缺少窗口 ID");
    console.error(error.message);
    throw error;
  }
  try {
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (error) {
    throw logAndNormalizeError(error, "无法聚焦标签页窗口");
  }
  try {
    await chrome.tabs.update(tabId, { active: true });
  } catch (error) {
    throw logAndNormalizeError(error, "无法激活标签页");
  }
};

export const sendMessageToTab = async <TRequest extends ContentScriptRequest>(
  tabId: number,
  payload: TRequest,
): Promise<ContentScriptResponseByRequest<TRequest>> => {
  await ensureTabConnectable(tabId);
  try {
    const response = await chrome.tabs.sendMessage(tabId, payload);
    if (response === null || response === undefined) {
      throw new Error("页面未返回结果");
    }
    const responseErrorMessage = resolveResponseErrorMessage(response);
    if (responseErrorMessage !== null) {
      throw new Error(responseErrorMessage);
    }
    return response;
  } catch (error) {
    throw logAndNormalizeError(error, "无法发送消息到页面");
  }
};

export const waitForContentScript = async (
  tabId: number,
  timeoutMs = 10000,
): Promise<boolean> => {
  if (!Number.isInteger(tabId) || tabId <= 0) {
    const error = new Error("Tab ID 必须是正整数");
    console.error(error.message);
    throw error;
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    const error = new Error("timeoutMs 必须是正整数");
    console.error(error.message);
    throw error;
  }
  registerContentScriptListeners();
  const tab = await ensureTabConnectable(tabId);
  if (tab.status === "complete") {
    return true;
  }
  const waitForReady = (): Promise<boolean> =>
    new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = 0;
      const cleanup = (): void => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeoutId);
          const waiters = pendingWaits.get(tabId);
          if (!waiters) {
            return;
          }
          waiters.delete(waiter);
          if (!waiters.size) {
            pendingWaits.delete(tabId);
          }
        },
        waiter: PendingWaiter = {
          resolve: (isComplete: boolean) => {
            cleanup();
            resolve(isComplete);
          },
          reject: (error: Error) => {
            cleanup();
            reject(error);
          },
          timeoutId: 0,
        };
      timeoutId = setTimeout(() => {
        const error = new Error(
          `页面在 ${String(timeoutMs)}ms 内未完成加载，继续尝试抓取`,
        );
        console.error(error.message);
        waiter.resolve(false);
      }, timeoutMs);
      waiter.timeoutId = timeoutId;
      const waiters = pendingWaits.get(tabId) ?? new Set<PendingWaiter>();
      waiters.add(waiter);
      pendingWaits.set(tabId, waiters);
      void getTabSnapshot(tabId)
        .then((currentTab) => {
          if (currentTab.status === "complete") {
            waiter.resolve(true);
          }
        })
        .catch((error: unknown) => {
          if (error instanceof Error) {
            waiter.reject(error);
            return;
          }
          waiter.reject(logAndNormalizeError(error, "无法获取标签页状态"));
        });
    });
  return waitForReady();
};
