import { addMessage, state, updateMessage } from "./store.js";
import { createRandomId } from "../utils/index.ts";

type MessageRecord = {
  role?: string;
  pending?: boolean;
  content?: string;
  groupId?: string;
};

type StateShape = {
  messages: Array<MessageRecord | undefined>;
};

const addMessageSafe = addMessage as (message: MessageRecord) => MessageRecord,
  updateMessageSafe = updateMessage as (
    index: number,
    patch: Partial<MessageRecord>,
  ) => MessageRecord;

const resolveMessageContent = (message?: MessageRecord): string => {
  if (!message || message.content === undefined) {
    return "";
  }
  if (typeof message.content !== "string") {
    throw new Error("助手消息内容必须为字符串");
  }
  return message.content;
};

export const appendAssistantDelta = (delta: unknown): void => {
  if (delta === undefined || delta === null) {
    return;
  }
  if (typeof delta !== "string") {
    throw new Error("助手增量内容必须为字符串");
  }
  if (delta.length === 0) {
    return;
  }
  const currentState = state as StateShape;
  let targetIndex: number | null = null;
  for (let i = currentState.messages.length - 1; i >= 0; i -= 1) {
    const message = currentState.messages[i];
    if (message && message.role === "assistant" && message.pending === true) {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex === null) {
    const lastIndex = currentState.messages.length - 1,
      last = currentState.messages[lastIndex];
    if (!last || last.role !== "assistant") {
      addMessageSafe({
        role: "assistant",
        content: delta,
        groupId: createRandomId("assistant"),
      });
      return;
    }
    targetIndex = lastIndex;
  }
  const target = currentState.messages[targetIndex];
  if (!target) {
    throw new Error("助手消息状态无效");
  }
  updateMessageSafe(targetIndex, {
    content: `${resolveMessageContent(target)}${delta}`,
  });
};
