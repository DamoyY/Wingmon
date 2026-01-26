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
  const response = await fetch(
    chrome.runtime.getURL("public/system_prompt.md"),
  );
  if (!response.ok) {
    throw new Error(`系统提示加载失败：${response.status}`);
  }
  state.systemPrompt = (await response.text()) || "";
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
      if (typeof DOMParser !== "function") {
        throw new Error("DOMParser 不可用，无法解析页面 HTML");
      }
      const parser = new DOMParser();
      const documentResult = parser.parseFromString(pageData.html, "text/html");
      if (!documentResult?.body) {
        throw new Error("解析页面 HTML 失败");
      }
      const normalizeText = (value) => (value || "").trim();
      const getLabelFromIds = (ids) => {
        const labels = ids.map((id) => {
          const target = documentResult.getElementById(id);
          if (!target) {
            throw new Error(`aria-labelledby 指向不存在的元素: ${id}`);
          }
          return normalizeText(target.textContent);
        });
        const merged = labels.filter(Boolean).join(" ").trim();
        return merged || "";
      };
      const getButtonLabel = (button) => {
        const directText =
          button.tagName === "INPUT" ? button.value : button.textContent;
        const normalizedText = normalizeText(directText);
        if (normalizedText) return normalizedText;
        const ariaLabel = normalizeText(button.getAttribute("aria-label"));
        if (ariaLabel) return ariaLabel;
        const ariaLabelledby = normalizeText(
          button.getAttribute("aria-labelledby"),
        );
        if (ariaLabelledby) {
          const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
          if (!ids.length) {
            throw new Error("aria-labelledby 为空，无法解析按钮名称");
          }
          const labeledText = getLabelFromIds(ids);
          if (labeledText) return labeledText;
        }
        const titleText = normalizeText(button.getAttribute("title"));
        if (titleText) return titleText;
        const imgAlt = normalizeText(
          button.querySelector("img")?.getAttribute("alt"),
        );
        if (imgAlt) return imgAlt;
        const svgTitle = normalizeText(
          button.querySelector("svg title")?.textContent,
        );
        if (svgTitle) return svgTitle;
        const svgLabel = normalizeText(
          button.querySelector("svg")?.getAttribute("aria-label"),
        );
        if (svgLabel) return svgLabel;
        return "未命名按钮";
      };
      const buttons = documentResult.body.querySelectorAll(
        'button, input[type="button"], input[type="submit"]',
      );
      const buttonCount = buttons.length;
      const idBase = 36;
      const minIdLength = 4;
      const idLength =
        buttonCount <= 1 ? minIdLength : (
          Math.max(
            minIdLength,
            Math.ceil(Math.log(buttonCount) / Math.log(idBase)),
          )
        );
      const usedIds = new Set();
      buttons.forEach((button, index) => {
        const text = getButtonLabel(button);
        const id = index.toString(idBase).padStart(idLength, "0");
        if (usedIds.has(id)) {
          throw new Error(`生成按钮 ID 重复: ${id}`);
        }
        usedIds.add(id);
        const replacement = `[button: "${text}", id: "${id}"]`;
        button.textContent = replacement;
        if (button.tagName === "INPUT") {
          button.value = replacement;
        }
      });
      const processedHtml = documentResult.body.innerHTML;
      const content = turndown.turndown(processedHtml);
      pageContent = `\n## 以下是用户当前正在查看的页面：\n\n**标题：**\n${pageData.title}\n**地址：**\n${pageData.url}\n**内容：**\n${content}`;
    } else {
      throw new Error("页面内容为空");
    }
  }
  if (!raw) return "";
  const merged = raw.split("<<page_content>>").join(pageContent).trim();
  return merged || "";
};
