import type {
  ContentScriptRequest,
  ContentScriptResponseByRequest,
} from "../../../shared/index.ts";
import { isInternalUrl } from "../../lib/utils/index.ts";

export type BrowserTab = chrome.tabs.Tab;

export type CreatedBrowserTab = BrowserTab & {
  id: number;
};

type PendingWaiter = {
  reject: (error: Error) => void;
  resolve: (isComplete: boolean) => void;
  timeoutId: number;
};

type TabNavigationFailure = {
  error: string;
  url: string;
};

type AssistantTabGroup = {
  groupId: number;
  windowId: number;
};

type ContentScriptSuccessResponse<TRequest extends ContentScriptRequest> =
  Exclude<ContentScriptResponseByRequest<TRequest>, { error: string }>;

const pendingWaits: Map<number, Set<PendingWaiter>> = new Map();
const tabNavigationFailures: Map<number, TabNavigationFailure> = new Map();
const assistantOpenedTabIds: Set<number> = new Set();
let listenersReady = false,
  navigationListenersReady = false,
  assistantTabGroup: AssistantTabGroup | null = null;

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
  resolveNavigationFailureError = (error: string): string | null => {
    const normalized = error.trim();
    if (!normalized) {
      return null;
    }
    return normalized;
  },
  clearTabNavigationFailure = (tabId: number): void => {
    tabNavigationFailures.delete(tabId);
  },
  setTabNavigationFailure = (
    tabId: number,
    error: string,
    url: string,
  ): void => {
    tabNavigationFailures.set(tabId, { error, url });
  },
  removeAssistantTabTracking = (tabId: number): void => {
    assistantOpenedTabIds.delete(tabId);
    if (assistantOpenedTabIds.size === 0) {
      assistantTabGroup = null;
    }
  },
  resolveTabWindowId = (tab: BrowserTab): number => {
    if (typeof tab.windowId !== "number") {
      throw new Error("标签页缺少窗口 ID");
    }
    return tab.windowId;
  },
  resolveAssistantTabWindowId = async (
    tabId: number,
  ): Promise<number | null> => {
    try {
      const tab = await chrome.tabs.get(tabId);
      return resolveTabWindowId(tab);
    } catch (error) {
      console.error("获取助手标签页窗口失败", { tabId }, error);
      assistantOpenedTabIds.delete(tabId);
      return null;
    }
  },
  collectAssistantTabIdsByWindow = async (
    windowId: number,
    excludeTabId: number,
  ): Promise<number[]> => {
    const tabIds: number[] = [];
    for (const candidateTabId of assistantOpenedTabIds) {
      if (candidateTabId === excludeTabId) {
        continue;
      }
      const candidateWindowId =
        await resolveAssistantTabWindowId(candidateTabId);
      if (candidateWindowId === null) {
        continue;
      }
      if (candidateWindowId === windowId) {
        tabIds.push(candidateTabId);
      }
    }
    return tabIds;
  },
  renameAssistantTabGroup = async (groupId: number): Promise<void> => {
    try {
      await chrome.tabGroups.update(groupId, { title: "Wingmon" });
    } catch (error) {
      console.error("设置助手标签页分组标题失败", { groupId }, error);
      throw error instanceof Error
        ? error
        : new Error("设置助手标签页分组标题失败");
    }
  },
  createAssistantTabGroup = async (
    tabId: number,
    windowId: number,
  ): Promise<void> => {
    let groupId = 0;
    try {
      groupId = await chrome.tabs.group({ tabIds: [tabId] });
    } catch (error) {
      console.error("创建助手标签页分组失败", { tabId }, error);
      throw error instanceof Error
        ? error
        : new Error("创建助手标签页分组失败");
    }
    await renameAssistantTabGroup(groupId);
    assistantTabGroup = { groupId, windowId };
    const existingTabIds = await collectAssistantTabIdsByWindow(
      windowId,
      tabId,
    );
    if (existingTabIds.length === 0) {
      return;
    }
    try {
      await chrome.tabs.group({ groupId, tabIds: existingTabIds });
    } catch (error) {
      console.error(
        "将已有助手标签页加入分组失败",
        { groupId, tabIds: existingTabIds },
        error,
      );
      throw error instanceof Error
        ? error
        : new Error("将已有助手标签页加入分组失败");
    }
  },
  addTabToAssistantGroup = async (
    tabId: number,
    windowId: number,
  ): Promise<boolean> => {
    if (assistantTabGroup === null) {
      return false;
    }
    if (assistantTabGroup.windowId !== windowId) {
      return false;
    }
    try {
      await chrome.tabs.group({
        groupId: assistantTabGroup.groupId,
        tabIds: [tabId],
      });
      await renameAssistantTabGroup(assistantTabGroup.groupId);
      return true;
    } catch (error) {
      console.error(
        "将标签页加入助手分组失败",
        { groupId: assistantTabGroup.groupId, tabId },
        error,
      );
      assistantTabGroup = null;
      return false;
    }
  },
  ensureAssistantTabGroup = async (tab: CreatedBrowserTab): Promise<void> => {
    const windowId = resolveTabWindowId(tab);
    const isAdded = await addTabToAssistantGroup(tab.id, windowId);
    if (isAdded) {
      return;
    }
    await createAssistantTabGroup(tab.id, windowId);
  },
  registerNavigationListeners = (): void => {
    if (navigationListenersReady) {
      return;
    }
    navigationListenersReady = true;
    try {
      chrome.webNavigation.onCommitted.addListener((details) => {
        if (details.frameId !== 0) {
          return;
        }
        clearTabNavigationFailure(details.tabId);
      });
      chrome.webNavigation.onCompleted.addListener((details) => {
        if (details.frameId !== 0) {
          return;
        }
        clearTabNavigationFailure(details.tabId);
      });
      chrome.webNavigation.onErrorOccurred.addListener((details) => {
        if (details.frameId !== 0) {
          return;
        }
        const error = resolveNavigationFailureError(details.error);
        if (error === null) {
          return;
        }
        setTabNavigationFailure(details.tabId, error, details.url);
      });
    } catch (error) {
      console.error("webNavigation API 不可用，无法追踪页面导航错误", error);
    }
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
      return await chrome.tabs.get(tabId);
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
    chrome.tabs.onRemoved.addListener((tabId) => {
      clearTabNavigationFailure(tabId);
      removeAssistantTabTracking(tabId);
      resolvePendingWaits(tabId, false);
    });
    registerNavigationListeners();
  },
  isErrorResponse = <TRequest extends ContentScriptRequest>(
    response: ContentScriptResponseByRequest<TRequest>,
  ): response is Extract<
    ContentScriptResponseByRequest<TRequest>,
    { error: string }
  > => {
    return (
      "error" in response &&
      typeof response.error === "string" &&
      response.error.trim().length > 0
    );
  };

export const initTabListeners = (): void => {
  registerContentScriptListeners();
};

export const getTabNavigationFailure = (
  tabId: number,
): TabNavigationFailure | null => {
  const failure = tabNavigationFailures.get(tabId);
  if (!failure) {
    return null;
  }
  return { ...failure };
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
    const tab = await chrome.tabs.create({ active, url });
    if (typeof tab.id !== "number") {
      throw new Error("创建标签页失败：缺少 Tab ID");
    }
    const createdTab: CreatedBrowserTab = { ...tab, id: tab.id };
    assistantOpenedTabIds.add(createdTab.id);
    await ensureAssistantTabGroup(createdTab);
    return createdTab;
  } catch (error) {
    throw logAndNormalizeError(error, "无法创建标签页");
  }
};

export const setTabGroupCollapsed = async (
  tabId: number,
  collapsed: boolean,
): Promise<void> => {
  if (typeof tabId !== "number") {
    const error = new Error("Tab ID 必须是数字");
    console.error(error.message);
    throw error;
  }
  let tab: BrowserTab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    throw logAndNormalizeError(error, "无法获取标签页");
  }
  if (typeof tab.groupId !== "number") {
    const error = new Error("标签页缺少分组 ID");
    console.error(error.message);
    throw error;
  }
  if (tab.groupId < 0) {
    const error = new Error("标签页未加入分组");
    console.error(error.message, { groupId: tab.groupId, tabId });
    throw error;
  }
  try {
    await chrome.tabGroups.update(tab.groupId, { collapsed });
  } catch (error) {
    throw logAndNormalizeError(error, "无法更新标签页分组折叠状态");
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
  let tab: BrowserTab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    throw logAndNormalizeError(error, "无法获取标签页");
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
): Promise<ContentScriptSuccessResponse<TRequest>> => {
  await ensureTabConnectable(tabId);
  try {
    const response = await chrome.tabs.sendMessage<
      TRequest,
      ContentScriptResponseByRequest<TRequest> | null | undefined
    >(tabId, payload);
    if (response === null || response === undefined) {
      throw new Error("页面未返回结果");
    }
    if (isErrorResponse(response)) {
      throw new Error(response.error);
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
          reject: (error: Error) => {
            cleanup();
            reject(error);
          },
          resolve: (isComplete: boolean) => {
            cleanup();
            resolve(isComplete);
          },
          timeoutId: 0,
        };
      timeoutId = setTimeout(() => {
        const error = new Error(
          `${String(timeoutMs)}ms 内未加载完成，不再等待直接抓取`,
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
