import type { PanelMessageRecord } from "../contracts/panelServerRpc.ts";

export type ConversationRecord = {
  id: string;
  messages: PanelMessageRecord[];
  updatedAt: number;
};

type HistoryStoragePayload = Record<string, ConversationRecord[] | undefined>;

const MAX_HISTORY = 50;
const STORAGE_KEY = "chat_history";

const resolveStoredHistory = (
  result: HistoryStoragePayload,
): ConversationRecord[] => {
  const history = result[STORAGE_KEY];
  if (!Array.isArray(history)) {
    return [];
  }
  return history;
};

export const getHistory = async (): Promise<ConversationRecord[]> => {
  const result =
    await chrome.storage.local.get<HistoryStoragePayload>(STORAGE_KEY);
  return resolveStoredHistory(result);
};

export const saveConversation = async (
  id: string,
  messages: PanelMessageRecord[],
  updatedAt: number,
): Promise<void> => {
  if (!messages.length) {
    return;
  }
  const history = await getHistory();
  const existingIndex = history.findIndex((item) => item.id === id);
  const conversation: ConversationRecord = { id, messages, updatedAt };
  if (existingIndex >= 0) {
    history[existingIndex] = conversation;
  } else {
    history.unshift(conversation);
  }
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  await chrome.storage.local.set<HistoryStoragePayload>({
    [STORAGE_KEY]: history,
  });
};

export const loadConversation = async (
  id: string,
): Promise<ConversationRecord> => {
  const history = await getHistory();
  const conversation = history.find((item) => item.id === id);
  if (!conversation) {
    throw new Error("对话记录不存在");
  }
  return conversation;
};

export const deleteConversation = async (id: string): Promise<void> => {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await chrome.storage.local.set<HistoryStoragePayload>({
    [STORAGE_KEY]: filtered,
  });
};

export const persistConversation = async (
  id: string,
  messages: PanelMessageRecord[],
  updatedAt: number,
): Promise<void> => {
  if (!messages.length) {
    await deleteConversation(id);
    return;
  }
  await saveConversation(id, messages, updatedAt);
};
