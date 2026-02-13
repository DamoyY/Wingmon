import {
  isJsonObject,
  isJsonSchemaValue,
  isJsonValue,
  validateJsonSchemaValue,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
} from "../utils/runtimeValidation.ts";

type RandomIdGenerator = (prefix: string) => string;

export type MessageFieldValue = JsonValue | undefined;

export type MessageInput = {
  id?: string;
  role?: string;
  content?: string;
  pending?: boolean;
  hidden?: boolean;
  groupId?: string;
  name?: string;
  tool_call_id?: string;
  toolContext?: MessageFieldValue;
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
  name?: string;
  tool_call_id?: string;
  toolContext?: MessageFieldValue;
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

const messageRuntimeValueSchema: JsonSchema = {
  type: ["array", "boolean", "null", "number", "object", "string"],
};

const messageToolCallSchema: JsonSchema = {
  type: "object",
};

export const panelMessageRecordSchema: JsonSchema = {
  properties: {
    content: { type: "string" },
    groupId: { type: "string" },
    hidden: { type: "boolean" },
    id: {
      pattern: String.raw`\S`,
      type: "string",
    },
    name: { type: "string" },
    pending: { type: "boolean" },
    role: { type: "string" },
    tool_call_id: { type: "string" },
    tool_calls: {
      items: messageToolCallSchema,
      type: "array",
    },
    toolContext: messageRuntimeValueSchema,
  },
  required: ["id", "role", "content", "pending", "hidden", "groupId"],
  type: "object",
};

export const isMessageRecordValue = (
  value: unknown,
): value is MessageRecord => {
  if (!isJsonValue(value) || !isJsonObject(value)) {
    return false;
  }
  return isJsonSchemaValue(value, panelMessageRecordSchema);
};

export const ensureMessageRecord = (
  value: unknown,
  path = "消息",
): MessageRecord => {
  if (!isJsonValue(value) || !isJsonObject(value)) {
    throw new Error(`${path} 必须是对象`);
  }
  validateJsonSchemaValue(value, panelMessageRecordSchema, { path });
  if (!isMessageRecordValue(value)) {
    throw new Error(`${path} 无效`);
  }
  return value;
};

const toJsonMessageInput = (message: unknown): JsonObject => {
  if (
    typeof message !== "object" ||
    message === null ||
    Array.isArray(message)
  ) {
    throw new Error("消息必须是对象");
  }
  const normalized: JsonObject = {};
  Object.entries(message).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (!isJsonValue(value)) {
      throw new Error(`消息字段无效：${key}`);
    }
    normalized[key] = value;
  });
  return normalized;
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

export const createPanelStateStore = (createRandomId: RandomIdGenerator) => {
  const state: PanelState = {
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

  const subscribeState = <K extends StateKey>(
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

  const setStateValue = <K extends StateKey>(
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

  const resolveMessageId = (message: JsonObject): string => {
    if (typeof message.id !== "string" || message.id.trim().length === 0) {
      return createRandomId("msg");
    }
    return message.id;
  };

  const normalizeMessage = (message: MessageInput): MessageRecord => {
    const messageValue = toJsonMessageInput(message);
    const normalizedValue: JsonObject = {
      ...messageValue,
      content: Object.hasOwn(messageValue, "content")
        ? messageValue.content
        : "",
      groupId: Object.hasOwn(messageValue, "groupId")
        ? messageValue.groupId
        : "",
      hidden: false,
      id: resolveMessageId(messageValue),
      pending: Object.hasOwn(messageValue, "pending")
        ? messageValue.pending
        : false,
      role: Object.hasOwn(messageValue, "role") ? messageValue.role : "",
    };
    if (Object.hasOwn(normalizedValue, "status")) {
      delete normalizedValue.status;
    }
    const normalized = ensureMessageRecord(normalizedValue);
    return {
      ...normalized,
      hidden: resolveMessageHidden(normalized),
    };
  };

  const ensureMessageIndex = (index: number): void => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= state.messages.length
    ) {
      throw new Error("消息索引无效");
    }
  };

  const addMessage = (message: MessageInput): MessageRecord => {
    const normalized = normalizeMessage(message);
    state.messages.push(normalized);
    notifyStateChange("messages", {
      index: state.messages.length - 1,
      message: normalized,
      type: "add",
    });
    return normalized;
  };

  const updateMessage = (
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

  const removeMessage = (index: number): MessageRecord => {
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

  const setMessages = (messages: MessageInput[]): void => {
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

  const touchUpdatedAt = (): void => {
    setStateValue("updatedAt", Date.now(), { type: "touch" });
  };

  const resetConversation = (): void => {
    setStateValue("conversationId", createRandomId("conv"), { type: "reset" });
    setStateValue("activeStatus", null, { type: "reset" });
    setMessages([]);
    setStateValue("updatedAt", Date.now(), { type: "reset" });
  };

  const loadConversationState = (
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

  const appendAssistantDelta = (delta: string | null | undefined): void => {
    if (delta === undefined || delta === null) {
      return;
    }
    if (delta.length === 0) {
      return;
    }
    let targetIndex: number | null = null;
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (message.role === "assistant" && message.pending) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === null) {
      const last = state.messages.at(-1);
      if (!last || last.role !== "assistant") {
        addMessage({
          content: delta,
          groupId: createRandomId("assistant"),
          role: "assistant",
        });
        return;
      }
      targetIndex = state.messages.length - 1;
    }
    updateMessage(targetIndex, (current) => ({
      ...current,
      content: `${current.content}${delta}`,
    }));
  };

  return {
    addMessage,
    appendAssistantDelta,
    loadConversationState,
    removeMessage,
    resetConversation,
    setMessages,
    setStateValue,
    state,
    subscribeState,
    touchUpdatedAt,
    updateMessage,
  };
};
