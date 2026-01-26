const STORAGE_KEY = "chat_history";
const MAX_HISTORY = 50;

export const getHistory = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
};

export const saveConversation = async (id, messages, updatedAt) => {
  if (!messages.length) return;
  const history = await getHistory();
  const existingIndex = history.findIndex((item) => item.id === id);
  const conversation = { id, messages, updatedAt };
  if (existingIndex >= 0) {
    history[existingIndex] = conversation;
  } else {
    history.unshift(conversation);
  }
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: history });
};

export const loadConversation = async (id) => {
  const history = await getHistory();
  const conversation = history.find((item) => item.id === id);
  if (!conversation) {
    throw new Error("对话记录不存在");
  }
  return conversation;
};

export const deleteConversation = async (id) => {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
};
