import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
  shareToggle,
  statusEl,
  setText,
  normalizeTheme,
  turndown,
  state,
} from "./ui.js";

const settingsKeys = {
  apiKey: "openai_api_key",
  baseUrl: "openai_base_url",
  model: "openai_model",
  sharePage: "openai_share_page",
  apiType: "openai_api_type",
  theme: "openai_theme",
};
const toSettings = (data) => ({
  apiKey: data?.[settingsKeys.apiKey] || "",
  baseUrl: data?.[settingsKeys.baseUrl] || "",
  model: data?.[settingsKeys.model] || "",
  sharePage: Boolean(data?.[settingsKeys.sharePage]),
  apiType: data?.[settingsKeys.apiType] || "chat",
  theme: normalizeTheme(data?.[settingsKeys.theme] || "auto"),
});
export const getSettings = () =>
  new Promise((resolve) =>
    chrome.storage.local.get(Object.values(settingsKeys), (result) =>
      resolve(toSettings(result || {})),
    ),
  );
const setSettings = (settings) =>
  new Promise((resolve) =>
    chrome.storage.local.set(
      {
        [settingsKeys.apiKey]: settings.apiKey,
        [settingsKeys.baseUrl]: settings.baseUrl,
        [settingsKeys.model]: settings.model,
        [settingsKeys.sharePage]: settings.sharePage,
        [settingsKeys.apiType]: settings.apiType,
        [settingsKeys.theme]: normalizeTheme(settings.theme),
      },
      resolve,
    ),
  );
export const updateSettings = async (patch) => {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch,
    theme: normalizeTheme(patch.theme ?? current.theme),
  };
  await setSettings(next);
  return next;
};
export const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  apiTypeSelect.value = settings.apiType || "chat";
  themeSelect.value = normalizeTheme(settings.theme);
};
export const buildEndpoint = (baseUrl, apiType) => {
  const normalized = baseUrl.replace(/\/+$/, "");
  const chatPath = "/chat/completions";
  const responsesPath = "/responses";
  if (normalized.endsWith(chatPath)) {
    return apiType === "responses" ?
        `${normalized.slice(0, -chatPath.length)}${responsesPath}`
      : normalized;
  }
  if (normalized.endsWith(responsesPath)) {
    return apiType === "chat" ?
        `${normalized.slice(0, -responsesPath.length)}${chatPath}`
      : normalized;
  }
  return `${normalized}${apiType === "responses" ? responsesPath : chatPath}`;
};
const loadSystemPrompt = async () => {
  if (state.systemPrompt !== null) return state.systemPrompt;
  try {
    const response = await fetch(
      chrome.runtime.getURL("public/system_prompt.md"),
    );
    state.systemPrompt = response.ok ? (await response.text()) || "" : "";
  } catch (error) {
    state.systemPrompt = "";
  }
  return state.systemPrompt;
};
const getActiveTabContent = () =>
  new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (!tabId) return resolve({ error: "未找到活动标签页" });
      let finished = false;
      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        resolve({ error: "读取页面超时（2 秒）" });
      }, 2000);
      chrome.tabs.sendMessage(tabId, { type: "getPageContent" }, (response) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          const message =
            chrome.runtime.lastError.message || "无法发送消息到页面";
          return resolve({ error: message });
        }
        if (!response) return resolve({ error: "页面未返回内容" });
        resolve(response);
      });
    });
  });
export const buildSystemPrompt = async () => {
  const raw = await loadSystemPrompt();
  let pageContent = "";
  if (shareToggle.checked) {
    setText(statusEl, "读取页面中…");
    const pageData = await getActiveTabContent();
    if (pageData?.error) {
      throw new Error(pageData.error);
    }
    if (pageData?.html) {
      const content = turndown.turndown(pageData.html);
      pageContent = `\n## 以下是用户当前正在查看的页面：\n\n**标题：**\n${pageData.title}\n**地址：**\n${pageData.url}\n**内容：**\n${content}`;
    } else {
      throw new Error("页面内容为空");
    }
  }
  if (!raw) return "";
  const merged = raw.split("<<page_content>>").join(pageContent).trim();
  return merged || "";
};
