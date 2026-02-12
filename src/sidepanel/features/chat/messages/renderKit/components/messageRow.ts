import {
  createMessageContent,
  resolveMessageContentTypescaleClass,
  setMessageContent,
} from "./messageContent.ts";
import {
  createMessageStatusLine,
  updateMessageStatusLine,
} from "./messageStatus.ts";
import type { DisplayMessage } from "../../displayMessages.ts";
import type { MessageActionHandlers } from "../../actions.ts";
import { createMessageActions } from "./messageActions.ts";
import { resolveIndicesKey } from "../../../../../lib/utils/index.ts";

const createMessageNode = (message: DisplayMessage): HTMLDivElement => {
  const node = document.createElement("div");
  node.className = `message ${message.role}`;
  node.appendChild(createMessageContent(message.content, message.role));
  const status = createMessageStatusLine(message.status ?? "");
  if (status) {
    node.appendChild(status);
  }
  return node;
};

const applyMessageRowMeta = (
  row: HTMLDivElement,
  message: DisplayMessage,
): void => {
  row.className = `message-row ${message.role}`;
  row.dataset.indices = resolveIndicesKey(message.indices);
  row.dataset.messageKey = message.renderKey;
};

const resolveRowChild = (
  container: ParentNode,
  selector: string,
): HTMLElement | null => {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  return element;
};

const updateMessageNode = (
  node: HTMLElement,
  message: DisplayMessage,
): void => {
  node.className = `message ${message.role}`;
  const contentEl = resolveRowChild(node, ".message-content");
  if (!(contentEl instanceof HTMLDivElement)) {
    node.replaceChildren(createMessageContent(message.content, message.role));
  } else {
    contentEl.className = `message-content ${resolveMessageContentTypescaleClass(message.role)}`;
    setMessageContent(contentEl, message.content);
  }
  updateMessageStatusLine(node, message.status ?? "");
};

export const createMessageRow = (
  message: DisplayMessage,
  handlers: MessageActionHandlers,
): HTMLDivElement => {
  const row = document.createElement("div");
  applyMessageRowMeta(row, message);
  row.appendChild(createMessageNode(message));
  row.appendChild(createMessageActions(handlers));
  return row;
};

export const updateMessageRow = (
  row: HTMLDivElement,
  message: DisplayMessage,
  handlers: MessageActionHandlers,
): void => {
  applyMessageRowMeta(row, message);
  const messageNode = resolveRowChild(row, ":scope > .message");
  if (!messageNode) {
    row.prepend(createMessageNode(message));
  } else {
    updateMessageNode(messageNode, message);
  }
  const actionsNode = resolveRowChild(row, ":scope > .message-actions");
  if (!actionsNode) {
    row.appendChild(createMessageActions(handlers));
    return;
  }
  const latestMessageNode = resolveRowChild(row, ":scope > .message");
  if (!latestMessageNode) {
    throw new Error("消息节点更新失败");
  }
  if (actionsNode.previousElementSibling !== latestMessageNode) {
    row.insertBefore(actionsNode, latestMessageNode.nextSibling);
  }
};
