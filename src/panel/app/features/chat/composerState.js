import { elements } from "../../../ui/index.js";

const ensurePromptValue = (value) => {
  if (typeof value !== "string") {
    throw new Error("输入内容格式无效");
  }
  return value;
};

const ensurePromptElement = () => {
  const { promptEl } = elements;
  if (!promptEl) {
    throw new Error("输入框未找到");
  }
  return promptEl;
};

export const hasPromptContent = () => {
  const promptEl = ensurePromptElement();
  return Boolean(ensurePromptValue(promptEl.value).trim());
};

export const getPromptContent = () => {
  const promptEl = ensurePromptElement();
  return ensurePromptValue(promptEl.value).trim();
};

export const clearPromptContent = () => {
  const promptEl = ensurePromptElement();
  promptEl.value = "";
};
