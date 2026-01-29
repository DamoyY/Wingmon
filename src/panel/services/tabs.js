const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
export const getActiveTab = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
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
  });
export const waitForContentScript = async (tabId, timeoutMs = 30000) => {
  if (typeof tabId !== "number") {
    throw new Error("TabID 必须是数字");
  }
  const start = Date.now();
  let lastError = null;
  const poll = async () => {
    if (Date.now() - start >= timeoutMs) {
      const tail = lastError?.message ? `，最后错误：${lastError.message}` : "";
      throw new Error(`等待页面内容脚本就绪超时（${timeoutMs}ms${tail}）`);
    }
    try {
      const response = await sendMessageToTab(tabId, { type: "ping" });
      if (response?.ok) {
        return;
      }
      throw new Error("页面未返回就绪信号");
    } catch (error) {
      lastError = error;
      await delay(1000);
      await poll();
    }
  };
  await poll();
};
