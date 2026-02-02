import { isInternalUrl } from "../utils/index.js";

const pendingWaits = new Map();
let listenersReady = false;
const internalTabMessage = "浏览器内置页面不支持连接内容脚本";

const resolvePendingWaits = (tabId, isComplete) => {
  const waiters = pendingWaits.get(tabId);
  if (!waiters) {
    return;
  }
  waiters.forEach((waiter) => {
    clearTimeout(waiter.timeoutId);
    waiter.resolve(isComplete);
  });
  pendingWaits.delete(tabId);
};

const getTabSnapshot = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (currentTab) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法获取标签页状态";
        const error = new Error(message);
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
  });

const ensureTabConnectable = async (tabId) => {
  const tab = await getTabSnapshot(tabId);
  if (isInternalUrl(tab.url || "")) {
    const error = new Error(internalTabMessage);
    console.error(error.message);
    throw error;
  }
  return tab;
};

const registerContentScriptListeners = () => {
  if (listenersReady) {
    return;
  }
  listenersReady = true;
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      resolvePendingWaits(tabId, true);
    }
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
    const error = new Error("TabID 必须是数字");
    console.error(error.message);
    throw error;
  }
  registerContentScriptListeners();
  const tab = await ensureTabConnectable(tabId);
  if (tab.status === "complete") {
    return true;
  }
  const waitForReady = () =>
    new Promise((resolve, reject) => {
      let settled = false;
      const waiter = {
        resolve: null,
        reject: null,
        timeoutId: null,
      };
      const cleanup = () => {
        if (settled) {
          return;
        }
        settled = true;
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
      waiter.resolve = (isComplete) => {
        cleanup();
        resolve(Boolean(isComplete));
      };
      waiter.reject = (error) => {
        cleanup();
        reject(error);
      };
      waiter.timeoutId = setTimeout(() => {
        const error = new Error(
          `页面在 ${timeoutMs}ms 内未完成加载，继续尝试抓取`,
        );
        console.error(error.message);
        waiter.resolve(false);
      }, timeoutMs);
      const waiters = pendingWaits.get(tabId) || new Set();
      waiters.add(waiter);
      pendingWaits.set(tabId, waiters);
      getTabSnapshot(tabId)
        .then((currentTab) => {
          if (currentTab.status === "complete") {
            waiter.resolve(true);
          }
        })
        .catch((error) => {
          const failure =
            error instanceof Error ? error : new Error("无法获取标签页状态");
          console.error(failure.message);
          waiter.reject(failure);
        });
    });
  return waitForReady();
};
