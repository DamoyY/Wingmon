import { createRandomId } from "../utils/index.ts";

type MessageFieldValue =
  | string
  | number
  | boolean
  | null
  | MessageFieldValue[]
  | { [key: string]: MessageFieldValue }
  | undefined;

export type MessageRecord = {
  role?: string;
  content?: string;
  pending?: boolean;
  hidden?: boolean;
  groupId?: string;
  status?: string;
  tool_calls?: Array<{ [key: string]: MessageFieldValue }>;
  [key: string]: MessageFieldValue;
};

export type PanelState<TMessage extends MessageRecord = MessageRecord> = {
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
    type: "set",
    previous,
    value,
    ...detail,
  });
  return value;
};

const hasMessageContent = (content: MessageRecord["content"]): boolean =>
  typeof content === "string" && Boolean(content.trim());

const isPendingAssistant = (
  message: MessageRecord | null | undefined,
): boolean => message?.role === "assistant" && message.pending === true;

const resolveMessageHidden = (message: MessageRecord): boolean => {
  if (message.role === "tool") {
    return true;
  }
  if (message.role === "assistant" && !hasMessageContent(message.content)) {
    return !isPendingAssistant(message);
  }
  return false;
};

const normalizeMessage = <TMessage extends MessageRecord>(
  message: TMessage,
): TMessage => {
  const normalized = { ...message };
  normalized.hidden = resolveMessageHidden(normalized);
  return normalized;
};

const ensureMessageIndex = (index: number): void => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
};

export const addMessage = <TMessage extends MessageRecord>(
  message: TMessage,
): TMessage => {
  const normalized = normalizeMessage(message);
  state.messages.push(normalized);
  notifyStateChange("messages", {
    type: "add",
    index: state.messages.length - 1,
    message: normalized,
  });
  return normalized;
};

export const updateMessage = <TMessage extends MessageRecord = MessageRecord>(
  index: number,
  patch: Partial<TMessage> | ((message: TMessage) => TMessage),
): TMessage => {
  ensureMessageIndex(index);
  const current = state.messages[index] as TMessage;
  const next =
    typeof patch === "function"
      ? patch({ ...current })
      : ({ ...current, ...patch } as TMessage);
  const normalized = normalizeMessage(next);
  state.messages[index] = normalized;
  notifyStateChange("messages", {
    type: "update",
    index,
    message: normalized,
    previous: current,
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
    type: "remove",
    index,
    message: removed,
  });
  return removed;
};

export const setMessages = (messages: MessageRecord[]): void => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  const normalized = messages.map((message) => normalizeMessage(message));
  state.messages = normalized;
  notifyStateChange("messages", {
    type: "set",
    messages: normalized,
  });
};

export const touchUpdatedAt = (): void => {
  setStateValue("updatedAt", Date.now(), { type: "touch" });
};

export const resetConversation = (): void => {
  setStateValue("conversationId", createRandomId("conv"), { type: "reset" });
  setMessages([]);
  setStateValue("updatedAt", Date.now(), { type: "reset" });
};

export const loadConversationState = (
  id: string,
  messages: MessageRecord[],
  updatedAt: number,
): void => {
  setStateValue("conversationId", id, { type: "load" });
  const normalized = messages.map((message) => normalizeMessage(message));
  state.messages = normalized;
  notifyStateChange("messages", {
    type: "load",
    messages: normalized,
  });
  setStateValue("updatedAt", updatedAt, { type: "load" });
};
