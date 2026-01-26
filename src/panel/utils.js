const normalizeUrlBase = (url) => (url || "").trim().toLowerCase();
export const normalizeUrl = (url) =>
  normalizeUrlBase(url).replace(/[\u0000-\u001F\u007F\s]+/g, "");
export const createRandomId = (prefix) => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const tag = prefix ? `${prefix}_` : "";
  return `${tag}${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
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
