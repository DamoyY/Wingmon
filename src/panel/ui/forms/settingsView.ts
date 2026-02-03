import { elements } from "../core/elements.ts";
import setText from "../core/text.ts";

const ensureElement = (
  element: HTMLElement | undefined,
  label: string,
): HTMLElement => {
  if (!element) {
    throw new Error(`${label}未找到`);
  }
  return element;
};

export const setSettingsStatus = (message: string): void => {
  const status = ensureElement(elements.keyStatus, "状态提示元素");
  setText(status, message);
};

export const clearSettingsStatus = (): void => {
  setSettingsStatus("");
};

export const setSaveButtonVisible = (visible: boolean): void => {
  const saveKey = ensureElement(elements.saveKey, "保存按钮");
  saveKey.classList.toggle("hidden", !visible);
};
