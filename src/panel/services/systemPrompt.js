import { state } from "../state/index.js";

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

const buildSystemPrompt = async () => {
  const raw = await loadSystemPrompt();
  if (!raw) {
    return "";
  }
  return raw.trim();
};

export default buildSystemPrompt;
