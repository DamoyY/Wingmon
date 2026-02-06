import { isEditableElement } from "../dom/editableElements.js";

type EnterTextMessage = {
  id?: string | null;
  content?: string | null;
};

const normalizeInputId = (message: EnterTextMessage | null): string => {
  const id = typeof message?.id === "string" ? message.id.trim() : "";
  if (!id) {
    throw new Error("id 必须是非空字符串");
  }
  if (!/^[0-9a-z]+$/i.test(id)) {
    throw new Error("id 仅支持字母数字");
  }
  return id.toLowerCase();
};

const normalizeInputContent = (message: EnterTextMessage | null): string => {
  if (typeof message?.content !== "string") {
    throw new Error("content 必须是字符串");
  }
  return message.content;
};

const findSingleInput = (normalizedId: string): Element | null => {
  const matches = Array.from(
    document.querySelectorAll(`[data-llm-id="${normalizedId}"]`),
  );
  if (!matches.length) {
    return null;
  }
  const editableMatches = matches.filter(isEditableElement);
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

const handleEnterText = (
  message: EnterTextMessage,
  sendResponse: (response: {
    ok?: boolean;
    error?: string;
    reason?: string;
  }) => void,
): void => {
  try {
    const normalizedId = normalizeInputId(message),
      content = normalizeInputContent(message),
      target = findSingleInput(normalizedId);
    if (!target) {
      const errorMessage = `未找到 id 为 ${normalizedId} 的输入框`;
      console.error(errorMessage);
      sendResponse({ ok: false, reason: "not_found" });
      return;
    }
    fillInput(target, content);
    sendResponse({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "输入失败";
    console.error(errorMessage);
    sendResponse({ error: errorMessage });
  }
};

export default handleEnterText;
