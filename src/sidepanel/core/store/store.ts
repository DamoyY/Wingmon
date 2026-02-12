import { createRandomId } from "../../lib/utils/index.ts";

type MessageFieldValue =
  | string
  | number
  | boolean
  | null
  | MessageFieldValue[]
  | { [key: string]: MessageFieldValue }
  | undefined;

export type MessageInput = {
  id?: string;
  role?: string;
  content?: string;
  pending?: boolean;
  hidden?: boolean;
  groupId?: string;
  tool_calls?: Array<{ [key: string]: MessageFieldValue }>;
  [key: string]: MessageFieldValue;
};

export type MessageRecord = {
  id: string;
  role: string;
  content: string;
  pending: boolean;
  hidden: boolean;
  groupId: string;
  tool_calls?: Array<{ [key: string]: MessageFieldValue }>;
  [key: string]: MessageFieldValue;
};

export type PanelState<TMessage extends MessageRecord = MessageRecord> = {
  activeStatus: string | null;
  conversationId: string;
  messages: TMessage[];
  sending: boolean;
  systemPrompt: string | null;
  updatedAt: number;
};

type StateKey = keyof PanelState;
type StateChangeDetail = Record<string, MessageFieldValue>;

export type StateChangePayload<K extends StateKey = StateKey> = {
  key: K;
  state: PanelState;
} & StateChangeDetail;

type StateListener<K extends StateKey = StateKey> = (
  payload: StateChangePayload<K>,
) => void;

type SubscriberStore = Map<StateKey, Set<StateListener>>;

export const state: PanelState = {
  activeStatus: null,
  conversationId: createRandomId("conv"),
  messages: [],
  sending: false,
  systemPrompt: null,
  updatedAt: Date.now(),
};

const stateSubscribers: SubscriberStore = new Map();

const ensureSubscriberSet = <K extends StateKey>(
  key: K,
): Set<StateListener<K>> => {
  const existing = stateSubscribers.get(key);
  if (existing) {
    return existing as Set<StateListener<K>>;
  }
  const created = new Set<StateListener>();
  stateSubscribers.set(key, created);
  return created as Set<StateListener<K>>;
};

const ensureStateKey = <K extends StateKey>(key: K): K => {
  if (typeof key !== "string" || !key.trim()) {
    throw new Error("状态订阅键无效");
  }
  if (!Object.hasOwn(state, key)) {
    throw new Error(`未知状态字段：${key}`);
  }
  return key;
};

const notifyStateChange = (
  key: StateKey,
  detail: StateChangeDetail = {},
): void => {
  const resolvedKey = ensureStateKey(key);
  const listeners = stateSubscribers.get(resolvedKey);
  if (!listeners || !listeners.size) {
    return;
  }
  const payload: StateChangePayload = { key: resolvedKey, state, ...detail };
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("状态订阅回调执行失败", error);
    }
  });
};

export const subscribeState = <K extends StateKey>(
  key: K,
  listener: StateListener<K>,
): (() => void) => {
  const resolvedKey = ensureStateKey(key);
  if (typeof listener !== "function") {
    throw new Error("状态订阅回调无效");
  }
  const subscribers = ensureSubscriberSet(resolvedKey);
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
    if (!subscribers.size) {
      stateSubscribers.delete(resolvedKey);
    }
  };
};

export const setStateValue = <K extends StateKey>(
  key: K,
  value: PanelState[K],
  detail: StateChangeDetail = {},
): PanelState[K] => {
  const resolvedKey = ensureStateKey(key);
  const previous = state[resolvedKey];
  if (Object.is(previous, value)) {
    return value;
  }
  state[resolvedKey] = value;
  notifyStateChange(resolvedKey, {
    previous,
    type: "set",
    value,
    ...detail,
  });
  return value;
};

const hasMessageContent = (content: string): boolean => Boolean(content.trim());

const isPendingAssistant = (
  message: MessageRecord | null | undefined,
): boolean => message?.role === "assistant" && message.pending;

const resolveMessageHidden = (message: MessageRecord): boolean => {
  if (message.role === "tool") {
    return true;
  }
  if (message.role === "assistant" && !hasMessageContent(message.content)) {
    return !isPendingAssistant(message);
  }
  return false;
};

const resolveMessageId = (message: MessageInput): string => {
  if (typeof message.id !== "string" || message.id.trim().length === 0) {
    return createRandomId("msg");
  }
  return message.id;
};

const resolveMessageRole = (message: MessageInput): string => {
  if (message.role === undefined) {
    return "";
  }
  if (typeof message.role !== "string") {
    throw new Error("消息角色无效");
  }
  return message.role;
};

const resolveMessageContent = (message: MessageInput): string => {
  if (message.content === undefined) {
    return "";
  }
  if (typeof message.content !== "string") {
    throw new Error("消息内容无效");
  }
  return message.content;
};

const resolveMessagePending = (message: MessageInput): boolean => {
  if (message.pending === undefined) {
    return false;
  }
  if (typeof message.pending !== "boolean") {
    throw new Error("消息 pending 标记无效");
  }
  return message.pending;
};

const resolveMessageGroupId = (message: MessageInput): string => {
  if (message.groupId === undefined) {
    return "";
  }
  if (typeof message.groupId !== "string") {
    throw new Error("消息分组标识无效");
  }
  return message.groupId;
};

const resolveMessageToolCalls = (
  message: MessageInput,
): MessageRecord["tool_calls"] => {
  if (message.tool_calls === undefined) {
    return undefined;
  }
  if (!Array.isArray(message.tool_calls)) {
    throw new Error("消息工具调用列表无效");
  }
  return message.tool_calls;
};

const normalizeMessage = (message: MessageInput): MessageRecord => {
  const normalized: MessageRecord = {
    ...message,
    content: resolveMessageContent(message),
    groupId: resolveMessageGroupId(message),
    hidden: false,
    id: resolveMessageId(message),
    pending: resolveMessagePending(message),
    role: resolveMessageRole(message),
    tool_calls: resolveMessageToolCalls(message),
  };
  if (Object.hasOwn(normalized, "status")) {
    delete normalized.status;
  }
  normalized.hidden = resolveMessageHidden(normalized);
  return normalized;
};

const ensureMessageIndex = (index: number): void => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
};

export const addMessage = (message: MessageInput): MessageRecord => {
  const normalized = normalizeMessage(message);
  state.messages.push(normalized);
  notifyStateChange("messages", {
    index: state.messages.length - 1,
    message: normalized,
    type: "add",
  });
  return normalized;
};

export const updateMessage = (
  index: number,
  patch: Partial<MessageInput> | ((message: MessageRecord) => MessageInput),
): MessageRecord => {
  ensureMessageIndex(index);
  const current = state.messages[index];
  const next =
    typeof patch === "function"
      ? patch({ ...current })
      : { ...current, ...patch };
  const normalized = normalizeMessage(next);
  state.messages[index] = normalized;
  notifyStateChange("messages", {
    index,
    message: normalized,
    previous: current,
    type: "update",
  });
  return normalized;
};

export const removeMessage = (index: number): MessageRecord => {
  ensureMessageIndex(index);
  const removedList = state.messages.splice(index, 1);
  if (removedList.length !== 1) {
    throw new Error("消息删除失败");
  }
  const removed = removedList[0];
  notifyStateChange("messages", {
    index,
    message: removed,
    type: "remove",
  });
  return removed;
};

export const setMessages = (messages: MessageInput[]): void => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  const normalized = messages.map((message) => normalizeMessage(message));
  state.messages = normalized;
  notifyStateChange("messages", {
    messages: normalized,
    type: "set",
  });
};

export const touchUpdatedAt = (): void => {
  setStateValue("updatedAt", Date.now(), { type: "touch" });
};

export const resetConversation = (): void => {
  setStateValue("conversationId", createRandomId("conv"), { type: "reset" });
  setStateValue("activeStatus", null, { type: "reset" });
  setMessages([]);
  setStateValue("updatedAt", Date.now(), { type: "reset" });
};

export const loadConversationState = (
  id: string,
  messages: MessageInput[],
  updatedAt: number,
): void => {
  setStateValue("conversationId", id, { type: "load" });
  setStateValue("activeStatus", null, { type: "load" });
  const normalized = messages.map((message) => normalizeMessage(message));
  state.messages = normalized;
  notifyStateChange("messages", {
    messages: normalized,
    type: "load",
  });
  setStateValue("updatedAt", updatedAt, { type: "load" });
};
