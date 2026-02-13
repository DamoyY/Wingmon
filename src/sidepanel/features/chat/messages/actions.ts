import {
  type MessageRecord,
  state,
} from "../../../../shared/state/panelStateContext.ts";
import {
  combineMessageContents,
  normalizeIndices,
  t,
} from "../../../lib/utils/index.ts";
import { requestDeleteMessages } from "../../../core/server/index.ts";

export type ActionIndices = number | readonly number[];
type AnimateRemoval = (indices: ActionIndices) => Promise<boolean> | boolean;
type RestoreRemoval = (indices: ActionIndices) => void;
export type MessageActionError = Error;
type RefreshMessages = () => void;

export type MessageActionHandlers = {
  onCopy: (indices: ActionIndices) => Promise<void>;
  onDelete: (indices: ActionIndices) => Promise<void>;
  onError: (error: MessageActionError) => void;
};

const resolveMessageContent = (message: MessageRecord): string => {
  if (typeof message.content !== "string") {
    return "";
  }
  return message.content;
};

const resolveCombinedContent = (indices: number[]): string => {
  const contents = indices.map((index) => {
    const message = state.messages.at(index);
    if (!message) {
      throw new Error("消息索引无效");
    }
    return resolveMessageContent(message);
  });
  return combineMessageContents(contents);
};

const handleCopyMessage = async (indices: ActionIndices): Promise<void> => {
  const normalized = normalizeIndices(indices);
  const text = resolveCombinedContent(normalized);
  await navigator.clipboard.writeText(text);
};

const handleDeleteMessage = async (
  indices: ActionIndices,
  refreshMessages: RefreshMessages,
  animateRemoval?: AnimateRemoval,
  restoreRemoval?: RestoreRemoval,
): Promise<void> => {
  if (state.sending) {
    throw new Error(t("cannotDeleteDuringResponse"));
  }
  const normalized = normalizeIndices(indices);
  let hasAnimatedRemoval = false;
  if (typeof animateRemoval === "function") {
    hasAnimatedRemoval = await Promise.resolve(
      animateRemoval(normalized),
    ).catch((error: unknown) => {
      console.error("消息删除动画执行失败", error);
      return false;
    });
  }
  try {
    await requestDeleteMessages(normalized);
  } catch (error) {
    if (hasAnimatedRemoval && typeof restoreRemoval === "function") {
      restoreRemoval(normalized);
      refreshMessages();
    }
    throw error;
  }
};

const resolveErrorMessage = (error: MessageActionError): string => {
  if (error.message) {
    return error.message;
  }
  return t("actionFailed");
};

const reportActionError = (error: MessageActionError): void => {
  const message = resolveErrorMessage(error);
  console.error(message, error);
};

const createMessageActionHandlers = (
  refreshMessages: RefreshMessages,
  animateRemoval?: AnimateRemoval,
  restoreRemoval?: RestoreRemoval,
): MessageActionHandlers => {
  if (typeof refreshMessages !== "function") {
    throw new Error("刷新消息回调缺失");
  }
  return {
    onCopy: (indices) => handleCopyMessage(indices),
    onDelete: (indices) =>
      handleDeleteMessage(
        indices,
        refreshMessages,
        animateRemoval,
        restoreRemoval,
      ),
    onError: reportActionError,
  };
};

export default createMessageActionHandlers;
