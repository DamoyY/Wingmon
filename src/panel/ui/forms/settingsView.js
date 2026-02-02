import { elements } from "../core/elements.js";
import setText from "../core/text.js";

const ensureElement = (element, label) => {
  if (!element) {
    throw new Error(`${label}未找到`);
  }
  return element;
};

export const setSettingsStatus = (message) => {
  const status = ensureElement(elements.keyStatus, "状态提示元素");
  setText(status, message);
};

export const clearSettingsStatus = () => {
  setSettingsStatus("");
};

export const setSaveButtonVisible = (visible) => {
  const saveKey = ensureElement(elements.saveKey, "保存按钮");
  saveKey.classList.toggle("hidden", !visible);
};
