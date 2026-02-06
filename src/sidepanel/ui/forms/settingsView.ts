import { elements } from "../core/elements.ts";
import setText from "../core/text.ts";
import { ensureElement } from "../../lib/utils/index.ts";

export const setSettingsStatus = (message: string): void => {
  const status = ensureElement(
    elements.keyStatus,
    "状态提示元素",
    "状态提示元素未找到",
  );
  setText(status, message);
};

export const clearSettingsStatus = (): void => {
  setSettingsStatus("");
};

export const setSaveButtonVisible = (visible: boolean): void => {
  const saveKey = ensureElement(elements.saveKey, "保存按钮", "保存按钮未找到");
  saveKey.classList.toggle("hidden", !visible);
};
