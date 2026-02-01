import { isInternalUrl } from "../utils/index.js";

const readyTabs = new Set();
const failedTabs = new Set();
const failedTabErrors = new Map();
const pendingWaits = new Map();
const pendingPings = new Map();
let listenersReady = false;
const contentScriptNotReadyMessage = "页面已完成加载但内容脚本未就绪";
const waitForReadyFailedMessage =
  "等待页面内容脚本就绪失败：页面已完成加载但未收到响应";
const internalTabMessage = "浏览器内置页面不支持连接内容脚本";
const pingRetryBaseDelayMs = 200;
const pingRetryStepMs = 150;
const pingRetryMaxDelayMs = 1000;

const resolveFailedTabError = (tabId) =>
  failedTabErrors.get(tabId) || new Error(contentScriptNotReadyMessage);

const markTabReady = (tabId) => {
  if (failedTabs.has(tabId)) {
    return;
  }
  readyTabs.add(tabId);
  const waiters = pendingWaits.get(tabId);
  if (!waiters) {
    return;
  }
  waiters.forEach((waiter) => {
    clearTimeout(waiter.timeoutId);
    waiter.resolve();
  });
  pendingWaits.delete(tabId);
};

const reportContentScriptFailure = (tabId, error) => {
  if (failedTabs.has(tabId)) {
    return resolveFailedTabError(tabId);
  }
  const failure =
    error instanceof Error ? error : new Error(contentScriptNotReadyMessage);
  failedTabs.add(tabId);
  failedTabErrors.set(tabId, failure);
  console.error(failure.message);
  const waiters = pendingWaits.get(tabId);
  if (!waiters) {
    return failure;
  }
  waiters.forEach((waiter) => {
    clearTimeout(waiter.timeoutId);
    waiter.reject(new Error(waitForReadyFailedMessage));
  });
  pendingWaits.delete(tabId);
  return failure;
};

const resolvePingRetryDelay = (attempt) =>
  Math.min(
    pingRetryBaseDelayMs + attempt * pingRetryStepMs,
    pingRetryMaxDelayMs,
  );

const cancelPendingPing = (tabId) => {
  const pending = pendingPings.get(tabId);
  if (!pending) {
    return;
  }
  pending.cancel();
  pendingPings.delete(tabId);
};

const getTabSnapshot = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (currentTab) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法获取标签页状态";
        reject(new Error(message));
        return;
      }
      if (!currentTab) {
        reject(new Error("未找到标签页"));
        return;
      }
      resolve(currentTab);
    });
  });

const ensureTabConnectable = async (tabId) => {
  const tab = await getTabSnapshot(tabId);
  if (isInternalUrl(tab.url || "")) {
    const error = new Error(internalTabMessage);
    reportContentScriptFailure(tabId, error);
    throw error;
  }
  return tab;
};

const pingContentScript = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || contentScriptNotReadyMessage;
        reject(new Error(message));
        return;
      }
      if (!response) {
        reject(new Error(contentScriptNotReadyMessage));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      if (response.ok !== true) {
        reject(new Error(contentScriptNotReadyMessage));
        return;
      }
      resolve();
    });
  });

const waitForContentScriptReady = (tabId, timeoutMs) => {
  if (readyTabs.has(tabId)) {
    return Promise.resolve();
  }
  if (failedTabs.has(tabId)) {
    return Promise.reject(resolveFailedTabError(tabId));
  }
  const existing = pendingPings.get(tabId);
  if (existing) {
    return existing.promise;
  }
  const startTime = Date.now();
  let attempt = 0;
  let warned = false;
  let timerId = null;
  let canceled = false;
  const promise = new Promise((resolve, reject) => {
    const attemptPing = () => {
      if (canceled) {
        reject(new Error("等待内容脚本已取消"));
        return;
      }
      pingContentScript(tabId)
        .then(() => {
          if (canceled) {
            reject(new Error("等待内容脚本已取消"));
            return;
          }
          markTabReady(tabId);
          resolve();
        })
        .catch((error) => {
          if (canceled) {
            reject(new Error("等待内容脚本已取消"));
            return;
          }
          if (!warned) {
            console.warn(
              "内容脚本尚未就绪，正在重试",
              error?.message || contentScriptNotReadyMessage,
            );
            warned = true;
          }
          if (Date.now() - startTime >= timeoutMs) {
            const failure = reportContentScriptFailure(tabId, error);
            reject(failure);
            return;
          }
          const delay = resolvePingRetryDelay(attempt);
          attempt += 1;
          timerId = setTimeout(attemptPing, delay);
        });
    };
    attemptPing();
  });
  const cancel = () => {
    canceled = true;
    if (timerId) {
      clearTimeout(timerId);
    }
  };
  pendingPings.set(tabId, { promise, cancel });
  promise.finally(() => {
    pendingPings.delete(tabId);
  });
  return promise;
};

const registerContentScriptListeners = () => {
  if (listenersReady) {
    return;
  }
  listenersReady = true;
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
      readyTabs.delete(tabId);
      failedTabs.delete(tabId);
      failedTabErrors.delete(tabId);
      cancelPendingPing(tabId);
      return;
    }
    if (changeInfo.status !== "complete") {
      return;
    }
    if (readyTabs.has(tabId) || failedTabs.has(tabId)) {
      return;
    }
    getTabSnapshot(tabId)
      .then((tab) => {
        if (isInternalUrl(tab.url || "")) {
          const waiters = pendingWaits.get(tabId);
          if (waiters?.size) {
            reportContentScriptFailure(tabId, new Error(internalTabMessage));
          }
          return null;
        }
        const waiters = pendingWaits.get(tabId);
        if (!waiters?.size) {
          return null;
        }
        return waitForContentScriptReady(tabId, 10000);
      })
      .catch((error) => {
        if (error?.message === "等待内容脚本已取消") {
          return;
        }
        reportContentScriptFailure(tabId, error);
      });
  });
};
export const initTabListeners = () => {
  registerContentScriptListeners();
};
export const getActiveTab = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法查询活动标签页";
        reject(new Error(message));
        return;
      }
      const tab = tabs?.[0];
      if (!tab) {
        reject(new Error("未找到活动标签页"));
        return;
      }
      resolve(tab);
    });
  });
export const getAllTabs = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法查询所有标签页";
        reject(new Error(message));
        return;
      }
      resolve(tabs);
    });
  });
export const createTab = (url, active) =>
  new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法创建标签页";
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
      resolve(tab);
    });
  });
export const closeTab = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法关闭标签页";
        reject(new Error(message));
        return;
      }
      resolve();
    });
  });
export const focusTab = (tabId) =>
  new Promise((resolve, reject) => {
    if (typeof tabId !== "number") {
      reject(new Error("TabID 必须是数字"));
      return;
    }
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法获取标签页";
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
          const message =
            chrome.runtime.lastError.message || "无法聚焦标签页窗口";
          reject(new Error(message));
          return;
        }
        chrome.tabs.update(tabId, { active: true }, () => {
          if (chrome.runtime.lastError) {
            const message =
              chrome.runtime.lastError.message || "无法激活标签页";
            reject(new Error(message));
            return;
          }
          resolve();
        });
      });
    });
  });
export const sendMessageToTab = (tabId, payload) =>
  ensureTabConnectable(tabId).then(
    () =>
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, payload, (response) => {
          if (chrome.runtime.lastError) {
            const message =
              chrome.runtime.lastError.message || "无法发送消息到页面";
            reject(new Error(message));
            return;
          }
          if (!response) {
            reject(new Error("页面未返回结果"));
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        });
      }),
  );
export const waitForContentScript = async (tabId, timeoutMs = 10000) => {
  if (typeof tabId !== "number") {
    throw new Error("TabID 必须是数字");
  }
  registerContentScriptListeners();
  if (readyTabs.has(tabId)) {
    return;
  }
  if (failedTabs.has(tabId)) {
    throw resolveFailedTabError(tabId);
  }
  const tab = await ensureTabConnectable(tabId);
  if (tab.status === "complete") {
    try {
      await waitForContentScriptReady(tabId, timeoutMs);
      return;
    } catch (error) {
      if (error?.message !== "等待内容脚本已取消") {
        throw error;
      }
      const refreshed = await getTabSnapshot(tabId);
      if (refreshed.status === "complete") {
        await waitForContentScriptReady(tabId, timeoutMs);
        return;
      }
    }
  }
  const waitForReady = () =>
    new Promise((resolve, reject) => {
      const waiter = {
        resolve: null,
        reject: null,
        timeoutId: null,
      };
      const cleanup = () => {
        clearTimeout(waiter.timeoutId);
        const waiters = pendingWaits.get(tabId);
        if (!waiters) {
          return;
        }
        waiters.delete(waiter);
        if (!waiters.size) {
          pendingWaits.delete(tabId);
        }
      };
      waiter.resolve = () => {
        cleanup();
        resolve();
      };
      waiter.reject = (error) => {
        cleanup();
        reject(error);
      };
      waiter.timeoutId = setTimeout(() => {
        waiter.reject(new Error(`页面加载超时（${timeoutMs}ms）`));
      }, timeoutMs);
      const waiters = pendingWaits.get(tabId) || new Set();
      waiters.add(waiter);
      pendingWaits.set(tabId, waiters);
    });
  await waitForReady();
};
