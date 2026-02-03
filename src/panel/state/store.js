import { createRandomId } from "../utils/index.ts";

export const state = {
  conversationId: createRandomId("conv"),
  messages: [],
  sending: false,
  systemPrompt: null,
  updatedAt: Date.now(),
};
const stateSubscribers = new Map(),
  ensureSubscriberSet = (key) => {
    if (!stateSubscribers.has(key)) {
      stateSubscribers.set(key, new Set());
    }
    return stateSubscribers.get(key);
  },
  ensureStateKey = (key) => {
    if (typeof key !== "string" || !key.trim()) {
      throw new Error("状态订阅键无效");
    }
    if (!Object.hasOwn(state, key)) {
      throw new Error(`未知状态字段：${key}`);
    }
    return key;
  },
  notifyStateChange = (key, detail = {}) => {
    const resolvedKey = ensureStateKey(key),
      listeners = stateSubscribers.get(resolvedKey);
    if (!listeners || !listeners.size) {
      return;
    }
    const payload = { key: resolvedKey, state, ...detail };
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error("状态订阅回调执行失败", error);
      }
    });
  };
export const subscribeState = (key, listener) => {
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
export const setStateValue = (key, value, detail = {}) => {
  const resolvedKey = ensureStateKey(key),
    previous = state[resolvedKey];
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
const hasMessageContent = (content) =>
    typeof content === "string" && Boolean(content.trim()),
  resolveMessageHidden = (message) => {
    if (message?.role === "tool") {
      return true;
    }
    if (message?.role === "assistant" && !hasMessageContent(message.content)) {
      return true;
    }
    return false;
  },
  normalizeMessage = (message) => {
    if (!message || typeof message !== "object") {
      throw new Error("消息格式无效");
    }
    const normalized = { ...message };
    normalized.hidden = resolveMessageHidden(normalized);
    return normalized;
  };
export const addMessage = (message) => {
  const normalized = normalizeMessage(message);
  state.messages.push(normalized);
  notifyStateChange("messages", {
    type: "add",
    index: state.messages.length - 1,
    message: normalized,
  });
  return normalized;
};
export const updateMessage = (index, patch) => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
  const current = state.messages[index],
    next =
      typeof patch === "function"
        ? patch({ ...current })
        : { ...current, ...patch },
    normalized = normalizeMessage(next);
  state.messages[index] = normalized;
  notifyStateChange("messages", {
    type: "update",
    index,
    message: normalized,
    previous: current,
  });
  return normalized;
};
export const removeMessage = (index) => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
  const removed = state.messages.splice(index, 1)[0];
  notifyStateChange("messages", {
    type: "remove",
    index,
    message: removed,
  });
  return removed;
};
export const setMessages = (messages) => {
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

export const touchUpdatedAt = () => {
  setStateValue("updatedAt", Date.now(), { type: "touch" });
};

export const resetConversation = () => {
  setStateValue("conversationId", createRandomId("conv"), { type: "reset" });
  setMessages([]);
  setStateValue("updatedAt", Date.now(), { type: "reset" });
};

export const loadConversationState = (id, messages, updatedAt) => {
  setStateValue("conversationId", id, { type: "load" });
  const normalized = messages.map((message) => normalizeMessage(message));
  state.messages = normalized;
  notifyStateChange("messages", {
    type: "load",
    messages: normalized,
  });
  setStateValue("updatedAt", updatedAt, { type: "load" });
};
