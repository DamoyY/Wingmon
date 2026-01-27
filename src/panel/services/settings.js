import normalizeTheme from "../utils/theme";
import { state } from "../state/store";

const settingsKeys = {
  apiKey: "openai_api_key",
  baseUrl: "openai_base_url",
  model: "openai_model",
  apiType: "openai_api_type",
  theme: "openai_theme",
};
const toSettings = (data) => ({
  apiKey: data?.[settingsKeys.apiKey] || "",
  baseUrl: data?.[settingsKeys.baseUrl] || "",
  model: data?.[settingsKeys.model] || "",
  apiType: data?.[settingsKeys.apiType] || "chat",
  theme: normalizeTheme(data?.[settingsKeys.theme] || "auto"),
});
export const getSettings = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(Object.values(settingsKeys), (result) => {
      resolve(toSettings(result || {}));
    });
  });
const setSettings = (settings) =>
  new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [settingsKeys.apiKey]: settings.apiKey,
        [settingsKeys.baseUrl]: settings.baseUrl,
        [settingsKeys.model]: settings.model,
        [settingsKeys.apiType]: settings.apiType,
        [settingsKeys.theme]: normalizeTheme(settings.theme),
      },
      resolve,
    );
  });
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
export const buildEndpoint = (baseUrl, apiType) => {
  const normalized = baseUrl.replace(/\/+$/, "");
  const chatPath = "/chat/completions";
  const responsesPath = "/responses";
  if (normalized.endsWith(chatPath)) {
    return apiType === "responses"
      ? `${normalized.slice(0, -chatPath.length)}${responsesPath}`
      : normalized;
  }
  if (normalized.endsWith(responsesPath)) {
    return apiType === "chat"
      ? `${normalized.slice(0, -responsesPath.length)}${chatPath}`
      : normalized;
  }
  return `${normalized}${apiType === "responses" ? responsesPath : chatPath}`;
};
const loadSystemPrompt = async () => {
  if (state.systemPrompt !== null) {
    return state.systemPrompt;
  }
  const response = await fetch(
    chrome.runtime.getURL("public/system_prompt.md"),
  );
  if (!response.ok) {
    throw new Error(`系统提示加载失败：${response.status}`);
  }
  state.systemPrompt = (await response.text()) || "";
  return state.systemPrompt;
};
export const buildSystemPrompt = async () => {
  const raw = await loadSystemPrompt();
  if (!raw) {
    return "";
  }
  return raw.trim();
};
