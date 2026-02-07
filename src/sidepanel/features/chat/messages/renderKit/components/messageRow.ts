import type { MessageActionHandlers } from "../../actions.ts";
import type { DisplayMessage } from "../../displayMessages.ts";
import { resolveIndicesKey } from "../../../../../lib/utils/index.ts";
import { createMessageActions } from "./messageActions.ts";
import { createMessageContent } from "./messageContent.ts";
import { createMessageStatusLine } from "./messageStatus.ts";

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

export const createMessageRow = (
  message: DisplayMessage,
  handlers: MessageActionHandlers,
): HTMLDivElement => {
  const row = document.createElement("div");
  row.className = `message-row ${message.role}`;
  row.dataset.indices = resolveIndicesKey(message.indices);
  row.appendChild(createMessageNode(message));
  row.appendChild(createMessageActions(message.indices, handlers));
  return row;
};
