import { removeMessage, state, touchUpdatedAt } from "../../../state/index.js";
import {
  deleteConversation,
  saveConversation,
} from "../../../services/index.js";
import { combineMessageContents, t } from "../../../utils/index.js";

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
};

const collectHiddenIndicesForward = (startIndex) => {
  const hiddenIndices = [];
  for (let i = startIndex + 1; i < state.messages.length; i += 1) {
    const message = state.messages[i];
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (!message.hidden) {
      break;
    }
    hiddenIndices.push(i);
  }
  return hiddenIndices;
};

const collectHiddenIndicesBackward = (startIndex) => {
  const hiddenIndices = [];
  for (let i = startIndex - 1; i >= 0; i -= 1) {
    const message = state.messages[i];
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (!message.hidden) {
      break;
    }
    hiddenIndices.push(i);
  }
  return hiddenIndices;
};

const handleDeleteMessage = async (
  indices,
  refreshMessages,
  animateRemoval,
) => {
  if (state.sending) {
    throw new Error(t("cannotDeleteDuringResponse"));
  }
  const normalized = normalizeIndices(indices);
  const hiddenIndices = new Set();
  normalized.forEach((index) => {
    const message = state.messages[index];
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (message.role === "user") {
      collectHiddenIndicesForward(index).forEach((hiddenIndex) => {
        hiddenIndices.add(hiddenIndex);
      });
      return;
    }
    if (message.role === "assistant") {
      collectHiddenIndicesBackward(index).forEach((hiddenIndex) => {
        hiddenIndices.add(hiddenIndex);
      });
      if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
        collectHiddenIndicesForward(index).forEach((hiddenIndex) => {
          hiddenIndices.add(hiddenIndex);
        });
      }
    }
  });
  if (typeof animateRemoval === "function") {
    try {
      await animateRemoval(normalized);
    } catch (error) {
      console.error("消息删除动画执行失败", error);
    }
  }
  const combined = Array.from(
    new Set([...normalized, ...Array.from(hiddenIndices)]),
  ).sort((a, b) => b - a);
  combined.forEach((index) => removeMessage(index));
  refreshMessages();
  await persistConversation();
};

const reportActionError = (error) => {
  const message = error?.message || t("actionFailed");
  console.error(message, error);
};

const createMessageActionHandlers = (refreshMessages, animateRemoval) => {
  if (typeof refreshMessages !== "function") {
    throw new Error("刷新消息回调缺失");
  }
  return {
    onCopy: (indices) => handleCopyMessage(indices),
    onDelete: (indices) =>
      handleDeleteMessage(indices, refreshMessages, animateRemoval),
    onError: reportActionError,
  };
};

export default createMessageActionHandlers;
