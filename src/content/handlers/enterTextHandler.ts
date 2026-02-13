import type {
  EnterTextRequest,
  EnterTextResponse,
} from "../../shared/index.ts";
import {
  isEditableElement,
  llmControlVisibilityOptions,
} from "../dom/editableElements.js";
import { isElementVisible } from "../dom/visibility.js";
import { normalizeLlmId } from "../common/index.ts";
import { waitForDomStability } from "./clickButtonHandler.js";

const findSingleInput = (normalizedId: string): Element | null => {
  const win = document.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  const matches = Array.from(
    document.querySelectorAll(`[data-llm-id="${normalizedId}"]`),
  );
  if (!matches.length) {
    return null;
  }
  const editableMatches = matches.filter((match) => {
    if (!isEditableElement(match)) {
      return false;
    }
    return isElementVisible(match, win, llmControlVisibilityOptions);
  });
  if (!editableMatches.length) {
    throw new Error(`找到 id 为 ${normalizedId} 的控件但不可输入`);
  }
  if (editableMatches.length > 1) {
    throw new Error(`找到多个 id 为 ${normalizedId} 的输入框`);
  }
  return editableMatches[0];
};

const dispatchInputEvents = (target: HTMLElement): void => {
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
};

const dispatchCtrlEnterEvents = (target: Element): void => {
  if (!(target instanceof HTMLElement)) {
    throw new Error("输入目标节点无效");
  }
  const ownerWindow = target.ownerDocument.defaultView;
  if (!ownerWindow) {
    throw new Error("无法获取窗口对象");
  }
  target.focus();
  const keyboardEventInit: KeyboardEventInit = {
      bubbles: true,
      cancelable: true,
      code: "Enter",
      ctrlKey: true,
      key: "Enter",
    },
    keyboardEventNames: Array<"keydown" | "keypress" | "keyup"> = [
      "keydown",
      "keypress",
      "keyup",
    ];
  keyboardEventNames.forEach((eventName) => {
    target.dispatchEvent(
      new ownerWindow.KeyboardEvent(eventName, keyboardEventInit),
    );
  });
};

const setInputValue = (
  target: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void => {
  const prototype =
      target instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype,
    descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (!descriptor?.set) {
    throw new Error("无法设置输入框值");
  }
  descriptor.set.call(target, value);
  dispatchInputEvents(target);
};

const setSelectValue = (select: HTMLSelectElement, value: string): void => {
  const options = Array.from(select.options);
  let matched = options.find((option) => option.value === value);
  if (!matched) {
    const trimmed = value.trim();
    if (trimmed) {
      matched = options.find((option) => option.text.trim() === trimmed);
    }
  }
  if (!matched) {
    throw new Error("未找到匹配的下拉选项");
  }
  select.value = matched.value;
  dispatchInputEvents(select);
};

const setEditableText = (target: HTMLElement, value: string): void => {
  target.textContent = value;
  dispatchInputEvents(target);
};

const fillInput = (target: Element, value: string): void => {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    setInputValue(target, value);
    return;
  }
  if (target instanceof HTMLSelectElement) {
    setSelectValue(target, value);
    return;
  }
  if (!(target instanceof HTMLElement)) {
    throw new Error("输入目标节点无效");
  }
  setEditableText(target, value);
};

const handleEnterText = async (
  message: EnterTextRequest,
  sendResponse: (response: EnterTextResponse) => void,
): Promise<void> => {
  try {
    const normalizedId = normalizeLlmId(message.id),
      content = message.content,
      pressEnter = message.pressEnter,
      target = findSingleInput(normalizedId);
    if (!target) {
      const warnMessage = `未找到 id 为 ${normalizedId} 的输入框`;
      console.warn(warnMessage);
      sendResponse({ ok: false, reason: "not_found" });
      return;
    }
    fillInput(target, content);
    if (pressEnter) {
      dispatchCtrlEnterEvents(target);
      await waitForDomStability();
    }
    sendResponse({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "输入失败";
    console.error(errorMessage);
    sendResponse({ error: errorMessage });
  }
};

export default handleEnterText;
