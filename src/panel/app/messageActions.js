import { reportStatus } from "../ui/index.js";
import { removeMessage, state, touchUpdatedAt } from "../state/index.js";
import { deleteConversation, saveConversation } from "../services/index.js";
import { combineMessageContents, t } from "../utils/index.js";

const setStatus = (text) => {
  reportStatus(text);
};

const persistConversation = async () => {
  if (!state.messages.length) {
    await deleteConversation(state.conversationId);
    return;
  }
  touchUpdatedAt();
  await saveConversation(state.conversationId, state.messages, state.updatedAt);
};

const normalizeIndices = (indices) => {
  if (Number.isInteger(indices)) {
    return [indices];
  }
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("消息索引无效");
  }
  const normalized = indices.filter((index) => Number.isInteger(index));
  if (normalized.length !== indices.length) {
    throw new Error("消息索引无效");
  }
  return normalized;
};

const resolveCombinedContent = (indices) => {
  const contents = indices.map((index) => {
    const message = state.messages[index];
    if (!message) {
      throw new Error("消息索引无效");
    }
    return message.content || "";
  });
  return combineMessageContents(contents);
};

const handleCopyMessage = async (indices) => {
  const normalized = normalizeIndices(indices);
  const text = resolveCombinedContent(normalized);
  if (typeof navigator?.clipboard?.writeText !== "function") {
    throw new Error("当前环境不支持复制");
  }
  await navigator.clipboard.writeText(text);
  if (!state.sending) {
    setStatus(t("copied"));
  }
};

const collectToolIndicesBetween = (indices) => {
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);
  const toolIndices = [];
  for (let i = minIndex; i <= maxIndex; i += 1) {
    const message = state.messages[i];
    if (message?.role === "tool") {
      toolIndices.push(i);
    }
  }
  return toolIndices;
};

const handleDeleteMessage = async (indices, refreshMessages) => {
  if (state.sending) {
    throw new Error(t("cannotDeleteDuringResponse"));
  }
  const normalized = normalizeIndices(indices);
  const toolIndices = collectToolIndicesBetween(normalized);
  const combined = Array.from(new Set([...normalized, ...toolIndices])).sort(
    (a, b) => b - a,
  );
  combined.forEach((index) => removeMessage(index));
  refreshMessages();
  await persistConversation();
};

const reportActionError = (error) => {
  const message = error?.message || t("actionFailed");
  setStatus(message);
};

const createMessageActionHandlers = (refreshMessages) => {
  if (typeof refreshMessages !== "function") {
    throw new Error("刷新消息回调缺失");
  }
  return {
    onCopy: (indices) => handleCopyMessage(indices),
    onDelete: (indices) => handleDeleteMessage(indices, refreshMessages),
    onError: reportActionError,
  };
};

export default createMessageActionHandlers;
