import { isInternalUrl, type JsonValue } from "../utils/index.ts";

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

type RuntimeLastError = {
  message?: string;
};

type ChromeRuntime = {
  lastError?: RuntimeLastError;
};

type ChromeTabChangeInfo = {
  status?: string;
};

type ChromeTabsApi = {
  get: (
    tabId: number,
    callback: (currentTab: BrowserTab | undefined) => void,
  ) => void;
  query: (
    queryInfo: { active?: boolean; currentWindow?: boolean },
    callback: (tabs: BrowserTab[]) => void,
  ) => void;
  create: (
    createProperties: { url: string; active: boolean },
    callback: (tab: BrowserTab | undefined) => void,
  ) => void;
  remove: (tabId: number, callback: () => void) => void;
  update: (
    tabId: number,
    updateProperties: { active: boolean },
    callback: () => void,
  ) => void;
  sendMessage: (
    tabId: number,
    payload: Record<string, JsonValue>,
    callback: (response: JsonValue | null | undefined) => void,
  ) => void;
  onUpdated: {
    addListener: (
      callback: (tabId: number, changeInfo: ChromeTabChangeInfo) => void,
    ) => void;
  };
};

type ChromeWindowsApi = {
  update: (
    windowId: number,
    updateProperties: { focused: boolean },
    callback: () => void,
  ) => void;
};

declare const chrome: {
  runtime: ChromeRuntime;
  tabs: ChromeTabsApi;
  windows: ChromeWindowsApi;
};

type PendingWaiter = {
  resolve: (isComplete: boolean) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

type ResponseWithError = {
  error?: JsonValue;
  [key: string]: JsonValue;
};

const pendingWaits: Map<number, Set<PendingWaiter>> = new Map();
let listenersReady = false;

const internalTabMessage = "浏览器内置页面不支持连接内容脚本",
  resolveRuntimeErrorMessage = (fallback: string): string =>
    chrome.runtime.lastError?.message || fallback,
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
  getTabSnapshot = (tabId: number): Promise<BrowserTab> =>
    new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (currentTab) => {
        if (chrome.runtime.lastError) {
          const message = resolveRuntimeErrorMessage("无法获取标签页状态"),
            error = new Error(message);
          console.error(error.message);
          reject(error);
          return;
        }
        if (!currentTab) {
          const error = new Error("未找到标签页");
          console.error(error.message);
          reject(error);
          return;
        }
        resolve(currentTab);
      });
    }),
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
  isResponseWithError = (value: JsonValue): value is ResponseWithError =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export const initTabListeners = (): void => {
  registerContentScriptListeners();
};

export const getActiveTab = (): Promise<BrowserTab> =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        const message = resolveRuntimeErrorMessage("无法查询活动标签页");
        reject(new Error(message));
        return;
      }
      if (!tabs.length) {
        reject(new Error("未找到活动标签页"));
        return;
      }
      resolve(tabs[0]);
    });
  });

export const getAllTabs = (): Promise<BrowserTab[]> =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        const message = resolveRuntimeErrorMessage("无法查询所有标签页");
        reject(new Error(message));
        return;
      }
      resolve(tabs);
    });
  });

export const createTab = (
  url: string,
  active: boolean,
): Promise<CreatedBrowserTab> =>
  new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        const message = resolveRuntimeErrorMessage("无法创建标签页");
        reject(new Error(message));
        return;
      }
      if (!tab) {
        reject(new Error("创建标签页失败"));
        return;
      }
      if (typeof tab.id !== "number") {
        reject(new Error("创建标签页失败：缺少 tab.id"));
        return;
      }
      resolve({ ...tab, id: tab.id });
    });
  });

export const closeTab = (tabId: number): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        const message = resolveRuntimeErrorMessage("无法关闭标签页");
        reject(new Error(message));
        return;
      }
      resolve();
    });
  });

export const focusTab = (tabId: number): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof tabId !== "number") {
      reject(new Error("TabID 必须是数字"));
      return;
    }
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        const message = resolveRuntimeErrorMessage("无法获取标签页");
        reject(new Error(message));
        return;
      }
      if (!tab) {
        reject(new Error("未找到标签页"));
        return;
      }
      if (typeof tab.windowId !== "number") {
        reject(new Error("标签页缺少窗口 ID"));
        return;
      }
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        if (chrome.runtime.lastError) {
          const message = resolveRuntimeErrorMessage("无法聚焦标签页窗口");
          reject(new Error(message));
          return;
        }
        chrome.tabs.update(tabId, { active: true }, () => {
          if (chrome.runtime.lastError) {
            const message = resolveRuntimeErrorMessage("无法激活标签页");
            reject(new Error(message));
            return;
          }
          resolve();
        });
      });
    });
  });

export const sendMessageToTab = <TResponse extends JsonValue = JsonValue>(
  tabId: number,
  payload: Record<string, JsonValue>,
): Promise<TResponse> =>
  ensureTabConnectable(tabId).then(
    () =>
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, payload, (response) => {
          if (chrome.runtime.lastError) {
            const message = resolveRuntimeErrorMessage("无法发送消息到页面");
            reject(new Error(message));
            return;
          }
          if (response === null || response === undefined) {
            reject(new Error("页面未返回结果"));
            return;
          }
          if (
            isResponseWithError(response) &&
            typeof response.error === "string" &&
            response.error.trim()
          ) {
            reject(new Error(response.error));
            return;
          }
          resolve(response as TResponse);
        });
      }),
  );

export const waitForContentScript = async (
  tabId: number,
  timeoutMs = 10000,
): Promise<boolean> => {
  if (!Number.isInteger(tabId) || tabId <= 0) {
    const error = new Error("TabID 必须是正整数");
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
          const failure =
            error instanceof Error ? error : new Error("无法获取标签页状态");
          console.error(failure.message);
          waiter.reject(failure);
        });
    });
  return waitForReady();
};
