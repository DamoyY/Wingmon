import {
  type MessageRecord,
  removeMessage,
  state,
  touchUpdatedAt,
} from "../../../core/store/index.ts";
import { persistConversation } from "../../../core/services/index.ts";
import {
  combineMessageContents,
  normalizeIndices,
  t,
} from "../../../lib/utils/index.ts";

export type ActionIndices = number | readonly number[];
type RefreshMessages = () => void;
type AnimateRemoval = (indices: ActionIndices) => Promise<boolean> | boolean;
export type MessageActionError = Error;

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
  },
  persistConversationState = async (): Promise<void> => {
    if (state.messages.length) {
      touchUpdatedAt();
    }
    await persistConversation(
      state.conversationId,
      state.messages,
      state.updatedAt,
    );
  },
  resolveCombinedContent = (indices: number[]): string => {
    const contents = indices.map((index) => {
      const message = state.messages.at(index);
      if (!message) {
        throw new Error("消息索引无效");
      }
      return resolveMessageContent(message);
    });
    return combineMessageContents(contents);
  },
  handleCopyMessage = async (indices: ActionIndices): Promise<void> => {
    const normalized = normalizeIndices(indices);
    const text = resolveCombinedContent(normalized);
    await navigator.clipboard.writeText(text);
  },
  collectHiddenIndicesForward = (startIndex: number): number[] => {
    const hiddenIndices: number[] = [];
    for (let i = startIndex + 1; i < state.messages.length; i += 1) {
      const message = state.messages.at(i);
      if (!message) {
        throw new Error("消息索引无效");
      }
      if (!message.hidden) {
        break;
      }
      hiddenIndices.push(i);
    }
    return hiddenIndices;
  },
  collectHiddenIndicesBackward = (startIndex: number): number[] => {
    const hiddenIndices: number[] = [];
    for (let i = startIndex - 1; i >= 0; i -= 1) {
      const message = state.messages.at(i);
      if (!message) {
        throw new Error("消息索引无效");
      }
      if (!message.hidden) {
        break;
      }
      hiddenIndices.push(i);
    }
    return hiddenIndices;
  },
  handleDeleteMessage = async (
    indices: ActionIndices,
    refreshMessages: RefreshMessages,
    animateRemoval?: AnimateRemoval,
  ): Promise<void> => {
    if (state.sending) {
      throw new Error(t("cannotDeleteDuringResponse"));
    }
    const normalized = normalizeIndices(indices);
    const hiddenIndices = new Set<number>();
    normalized.forEach((index) => {
      const message = state.messages.at(index);
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
      await Promise.resolve(animateRemoval(normalized)).catch(
        (error: unknown) => {
          console.error("消息删除动画执行失败", error);
        },
      );
    }
    const combined = Array.from(
      new Set([...normalized, ...Array.from(hiddenIndices)]),
    ).sort((a, b) => b - a);
    combined.forEach((index) => removeMessage(index));
    refreshMessages();
    await persistConversationState();
  },
  resolveErrorMessage = (error: MessageActionError): string => {
    if (error.message) {
      return error.message;
    }
    return t("actionFailed");
  },
  reportActionError = (error: MessageActionError): void => {
    const message = resolveErrorMessage(error);
    console.error(message, error);
  },
  createMessageActionHandlers = (
    refreshMessages: RefreshMessages,
    animateRemoval?: AnimateRemoval,
  ): MessageActionHandlers => {
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
