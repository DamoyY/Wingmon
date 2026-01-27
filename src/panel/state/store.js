import { createRandomId } from "../utils/index.js";

export const state = {
  conversationId: createRandomId("conv"),
  messages: [],
  sending: false,
  systemPrompt: null,
  updatedAt: Date.now(),
};
const hasMessageContent = (content) =>
  typeof content === "string" && Boolean(content.trim());
const resolveMessageHidden = (message) => {
  if (message?.role === "tool") {
    return true;
  }
  if (message?.role === "assistant" && !hasMessageContent(message.content)) {
    return true;
  }
  return false;
};
const normalizeMessage = (message) => {
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
  return normalized;
};
export const updateMessage = (index, patch) => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
  const current = state.messages[index];
  const next =
    typeof patch === "function"
      ? patch({ ...current })
      : { ...current, ...patch };
  const normalized = normalizeMessage(next);
  state.messages[index] = normalized;
  return normalized;
};
export const removeMessage = (index) => {
  if (!Number.isInteger(index) || index < 0 || index >= state.messages.length) {
    throw new Error("消息索引无效");
  }
  return state.messages.splice(index, 1)[0];
};
export const setMessages = (messages) => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  state.messages = messages.map((message) => normalizeMessage(message));
};

export const touchUpdatedAt = () => {
  state.updatedAt = Date.now();
};

export const resetConversation = () => {
  state.conversationId = createRandomId("conv");
  state.messages = [];
  state.updatedAt = Date.now();
};

export const loadConversationState = (id, messages, updatedAt) => {
  state.conversationId = id;
  state.messages = messages.map((message) => normalizeMessage(message));
  state.updatedAt = updatedAt;
};
