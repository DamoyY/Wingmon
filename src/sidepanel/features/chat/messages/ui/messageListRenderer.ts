import { animateMessageRowEnter } from "./animations.ts";
import {
  createMessageRow,
  getMessageRenderedText,
  setMessageContent,
  updateMessageStatusLine,
} from "./components/index.ts";
import { wrapTrailingText } from "../../../../lib/dom/index.ts";
import {
  requireElementById,
  resolveIndicesKey,
} from "../../../../lib/utils/index.ts";
import type { DisplayMessage } from "../displayMessages.ts";
import type { MessageActionHandlers } from "../actions.ts";

export type RenderOptions = {
  animateIndices?: number[];
};

const MESSAGE_REANIMATE_WINDOW = 200;
const STREAM_DELTA_CLASS_NAME = "stream-delta";

let pendingAnimateKey: string | null = null;
let pendingAnimateExpiresAt = 0;

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

const resolvePendingAnimateKey = (now: number): string | null => {
  if (!pendingAnimateKey || now > pendingAnimateExpiresAt) {
    pendingAnimateKey = null;
    pendingAnimateExpiresAt = 0;
    return null;
  }
  return pendingAnimateKey;
};

const resolveAnimationState = (
  options: RenderOptions,
): {
  animateKey: string | null;
  carryoverKey: string | null;
  shouldRefreshCarryover: boolean;
  animateKeys: Set<string>;
} => {
  const now = Date.now();
  const animateKey =
    options.animateIndices !== undefined
      ? resolveIndicesKey(options.animateIndices)
      : null;
  const carryoverKey = resolvePendingAnimateKey(now);
  const shouldRefreshCarryover = Boolean(carryoverKey) && !animateKey;
  const animateKeys = new Set<string>();
  if (animateKey) {
    animateKeys.add(animateKey);
  }
  if (carryoverKey) {
    animateKeys.add(carryoverKey);
  }
  return {
    animateKey,
    carryoverKey,
    shouldRefreshCarryover,
    animateKeys,
  };
};

const updatePendingAnimateState = (
  animateKey: string | null,
  shouldRefreshCarryover: boolean,
): void => {
  const now = Date.now();
  if (animateKey) {
    pendingAnimateKey = animateKey;
    pendingAnimateExpiresAt = now + MESSAGE_REANIMATE_WINDOW;
    return;
  }
  if (shouldRefreshCarryover) {
    pendingAnimateExpiresAt = now + MESSAGE_REANIMATE_WINDOW;
  }
};

export const renderMessages = (
  displayMessages: DisplayMessage[],
  handlers: MessageActionHandlers,
  options: RenderOptions = {},
): void => {
  const messagesEl = requireMessagesElement();
  let hasVisibleMessages = false;
  const { animateKey, shouldRefreshCarryover, animateKeys } =
    resolveAnimationState(options);
  const rowsToAnimate: HTMLElement[] = [];

  messagesEl.innerHTML = "";
  displayMessages.forEach((message) => {
    hasVisibleMessages = true;
    const row = createMessageRow(message, handlers);
    messagesEl.appendChild(row);
    if (animateKeys.size && row.dataset.indices) {
      if (animateKeys.has(row.dataset.indices)) {
        rowsToAnimate.push(row);
      }
    }
  });

  updatePendingAnimateState(animateKey, shouldRefreshCarryover);

  messagesEl.scrollTop = messagesEl.scrollHeight;
  rowsToAnimate.forEach((row) => {
    animateMessageRowEnter(row);
  });

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
  updateMessageStatusLine(messageEl, message.status || "");
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
