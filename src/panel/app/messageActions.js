import { reportStatus } from "../ui/index.js";
import { removeMessage, state, touchUpdatedAt } from "../state/index.js";
import { deleteConversation, saveConversation } from "../services/index.js";

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

const handleCopyMessage = async (index) => {
  const message = state.messages[index];
  if (!message) {
    throw new Error("消息索引无效");
  }
  if (typeof navigator?.clipboard?.writeText !== "function") {
    throw new Error("当前环境不支持复制");
  }
  await navigator.clipboard.writeText(message.content || "");
  if (!state.sending) {
    setStatus("已复制");
  }
};

const handleDeleteMessage = async (index, refreshMessages) => {
  if (state.sending) {
    throw new Error("回复中，暂时无法删除消息");
  }
  removeMessage(index);
  refreshMessages();
  await persistConversation();
};

const reportActionError = (error) => {
  const message = error?.message || "操作失败";
  setStatus(message);
};

const createMessageActionHandlers = (refreshMessages) => {
  if (typeof refreshMessages !== "function") {
    throw new Error("刷新消息回调缺失");
  }
  return {
    onCopy: (index) => handleCopyMessage(index),
    onDelete: (index) => handleDeleteMessage(index, refreshMessages),
    onError: reportActionError,
  };
};

export default createMessageActionHandlers;
