import {
  createMessageRow,
  getMessageRenderedText,
  setMessageContent,
  updateMessageRow,
  updateMessageStatusLine,
} from "./components/index.ts";
import {
  requireElementById,
  resolveIndicesKey,
} from "../../../../lib/utils/index.ts";
import type { DisplayMessage } from "../displayMessages.ts";
import type { MessageActionHandlers } from "../actions.ts";
import { animateMessageRowEnter } from "./animations.ts";
import { wrapTrailingText } from "../../../../lib/domTools/index.ts";

export type RenderOptions = {
  animateIndices?: number[];
};

const STREAM_DELTA_CLASS_NAME = "stream-delta";

const requireMessagesElement = (): HTMLElement =>
    requireElementById("messages", "messagesEl", "消息容器未找到"),
  requireNewChatButton = (): HTMLElement =>
    requireElementById("new-chat", "newChatButton", "新建对话按钮未找到"),
  setEmptyStateVisible = (visible: boolean): void => {
    requireElementById(
      "empty-state",
      "emptyState",
      "空状态容器未找到",
    ).classList.toggle("is-visible", visible);
  },
  resolveCommonPrefixLength = (
    previousText: string,
    nextText: string,
  ): number => {
    if (!previousText || !nextText) {
      return 0;
    }
    const max = Math.min(previousText.length, nextText.length);
    let index = 0;
    while (index < max && previousText[index] === nextText[index]) {
      index += 1;
    }
    return index;
  };

const resolveAnimateKey = (options: RenderOptions): string | null => {
  if (options.animateIndices === undefined) {
    return null;
  }
  return resolveIndicesKey(options.animateIndices);
};

const resolveMessageRenderKey = (message: DisplayMessage): string => {
  if (typeof message.renderKey !== "string" || !message.renderKey.trim()) {
    throw new Error("消息渲染键无效");
  }
  return message.renderKey;
};

const collectExistingRows = (
  messagesEl: HTMLElement,
): Map<string, HTMLDivElement> => {
  const rows = messagesEl.querySelectorAll(":scope > .message-row");
  const map = new Map<string, HTMLDivElement>();
  rows.forEach((row) => {
    if (!(row instanceof HTMLDivElement)) {
      return;
    }
    const messageKey = row.dataset.messageKey;
    if (typeof messageKey !== "string" || !messageKey.trim()) {
      row.remove();
      return;
    }
    if (map.has(messageKey)) {
      row.remove();
      return;
    }
    map.set(messageKey, row);
  });
  return map;
};

const reconcileMessageRows = (
  messagesEl: HTMLElement,
  displayMessages: DisplayMessage[],
  handlers: MessageActionHandlers,
  animateKey: string | null,
): HTMLElement[] => {
  const existingRows = collectExistingRows(messagesEl);
  const rowsToAnimate: HTMLElement[] = [];
  let referenceNode: Element | null = messagesEl.firstElementChild;
  displayMessages.forEach((message) => {
    const messageKey = resolveMessageRenderKey(message);
    const existingRow = existingRows.get(messageKey);
    const row = existingRow ?? createMessageRow(message, handlers);
    const isNewRow = existingRow === undefined;
    if (existingRow) {
      existingRows.delete(messageKey);
      updateMessageRow(row, message, handlers);
    }
    if (referenceNode === row) {
      referenceNode = referenceNode.nextElementSibling;
    } else {
      messagesEl.insertBefore(row, referenceNode);
    }
    if (
      isNewRow &&
      animateKey &&
      typeof row.dataset.indices === "string" &&
      row.dataset.indices === animateKey
    ) {
      rowsToAnimate.push(row);
    }
  });
  existingRows.forEach((row) => {
    row.remove();
  });
  return rowsToAnimate;
};

export const renderMessages = (
  displayMessages: DisplayMessage[],
  handlers: MessageActionHandlers,
  options: RenderOptions = {},
): void => {
  const messagesEl = requireMessagesElement();
  const animateKey = resolveAnimateKey(options);
  const rowsToAnimate = reconcileMessageRows(
    messagesEl,
    displayMessages,
    handlers,
    animateKey,
  );

  messagesEl.scrollTop = messagesEl.scrollHeight;
  rowsToAnimate.forEach((row) => {
    animateMessageRowEnter(row);
  });

  const hasVisibleMessages = displayMessages.length > 0;
  const button = requireNewChatButton();
  button.classList.toggle("hidden", !hasVisibleMessages);
  setEmptyStateVisible(!hasVisibleMessages);
};

const resolveLastAssistantRow = (
  messagesEl: HTMLElement,
): HTMLElement | null => {
  const lastEl = messagesEl.lastElementChild;
  if (!(lastEl instanceof HTMLElement)) {
    return null;
  }
  if (!lastEl.classList.contains("assistant")) {
    return null;
  }
  return lastEl;
};

export const updateLastAssistantMessage = (
  message: DisplayMessage | null,
): boolean => {
  const messagesEl = requireMessagesElement();
  if (!message || message.role !== "assistant") {
    return false;
  }
  const lastAssistantRow = resolveLastAssistantRow(messagesEl);
  if (!lastAssistantRow) {
    return false;
  }
  const contentEl = lastAssistantRow.querySelector(".message-content");
  if (!(contentEl instanceof HTMLElement)) {
    return false;
  }
  const previousRenderedText = getMessageRenderedText(contentEl);
  const newRenderedText = setMessageContent(contentEl, message.content);
  const commonPrefixLength = resolveCommonPrefixLength(
    previousRenderedText,
    newRenderedText,
  );
  const appendedLength = newRenderedText.length - commonPrefixLength;
  wrapTrailingText(contentEl, appendedLength, STREAM_DELTA_CLASS_NAME);
  const messageEl = contentEl.parentElement;
  if (!(messageEl instanceof HTMLElement)) {
    throw new Error("消息容器无效");
  }
  lastAssistantRow.dataset.indices = resolveIndicesKey(message.indices);
  lastAssistantRow.dataset.messageKey = message.renderKey;
  updateMessageStatusLine(messageEl, message.status || "");
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
