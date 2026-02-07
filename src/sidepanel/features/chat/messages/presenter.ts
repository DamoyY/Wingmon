import {
  type MessageRecord,
  type StateChangePayload,
  state,
  subscribeState,
} from "../../../core/store/index.ts";
import {
  animateMessageRemoval,
  renderMessages,
  updateLastAssistantMessage,
} from "../../../ui/index.ts";
import createMessageActionHandlers, {
  type MessageActionHandlers,
} from "./actions.ts";
import {
  buildDisplayMessages,
  type DisplayMessage,
} from "./displayMessages.ts";

type RenderMessagesOptions = {
  animateIndices?: number[];
};

type MessagesStateChange = StateChangePayload<"messages"> & {
  type?: string;
  index?: number;
  message?: MessageRecord;
};

let actionHandlers: MessageActionHandlers | null = null;
let unsubscribeMessages: (() => void) | null = null;

const buildMessagesForView = (): DisplayMessage[] =>
    buildDisplayMessages(state.messages),
  resolveAssistantGroupId = (message: MessageRecord, index: number): string => {
    if (typeof message.groupId === "string") {
      const trimmed = message.groupId.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return String(index);
  },
  resolveMessageChangeIndex = (change: MessagesStateChange): number | null => {
    if (!Number.isInteger(change.index) || change.index < 0) {
      return null;
    }
    return change.index;
  },
  refreshMessages = (): void => {
    if (!actionHandlers) {
      throw new Error("消息操作处理器尚未初始化");
    }
    renderMessages(buildMessagesForView(), actionHandlers);
  },
  ensureActionHandlers = (): MessageActionHandlers => {
    if (!actionHandlers) {
      actionHandlers = createMessageActionHandlers(
        refreshMessages,
        animateMessageRemoval,
      );
    }
    return actionHandlers;
  },
  renderMessagesFromState = (options?: RenderMessagesOptions): void => {
    renderMessages(buildMessagesForView(), ensureActionHandlers(), options);
  },
  isInLastAssistantGroup = (index: number): boolean => {
    if (!Number.isInteger(index) || index < 0) {
      return false;
    }
    let lastVisibleIndex = -1;
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (!message.hidden) {
        lastVisibleIndex = i;
        break;
      }
    }
    if (lastVisibleIndex < 0) {
      return false;
    }
    const lastVisible = state.messages[lastVisibleIndex];
    if (lastVisible.role !== "assistant") {
      return false;
    }
    const lastGroupId = resolveAssistantGroupId(lastVisible, lastVisibleIndex);
    for (let i = lastVisibleIndex; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (!message.hidden) {
        if (message.role !== "assistant") {
          return false;
        }
        const groupId = resolveAssistantGroupId(message, i);
        if (groupId !== lastGroupId) {
          return false;
        }
        if (i === index) {
          return true;
        }
      }
    }
    return false;
  },
  handleMessagesChange = (change: MessagesStateChange): void => {
    const changeType = typeof change.type === "string" ? change.type : "";
    if (changeType === "add") {
      if (change.message?.hidden) {
        return;
      }
      const changeIndex = resolveMessageChangeIndex(change);
      if (changeIndex === null) {
        renderMessagesFromState();
        return;
      }
      const previousRole = (() => {
          for (let i = changeIndex - 1; i >= 0; i -= 1) {
            const message = state.messages[i];
            if (!message.hidden) {
              if (typeof message.role === "string") {
                return message.role;
              }
              return null;
            }
          }
          return null;
        })(),
        shouldAnimate =
          change.message?.role === "user" ||
          (change.message?.role === "assistant" &&
            previousRole !== "assistant");
      renderMessagesFromState({
        animateIndices: shouldAnimate ? [changeIndex] : undefined,
      });
      return;
    }
    if (changeType === "remove" && change.message?.hidden) {
      return;
    }
    const changeIndex = resolveMessageChangeIndex(change);
    if (
      changeType === "update" &&
      change.message?.role === "assistant" &&
      changeIndex !== null &&
      isInLastAssistantGroup(changeIndex)
    ) {
      const displayMessages = buildMessagesForView();
      const lastEntry =
        displayMessages.length > 0
          ? displayMessages[displayMessages.length - 1]
          : null;
      const updated = updateLastAssistantMessage(lastEntry);
      if (updated) {
        return;
      }
      renderMessages(displayMessages, ensureActionHandlers());
      return;
    }
    renderMessagesFromState();
  },
  ensureMessagesSubscription = (): void => {
    if (unsubscribeMessages) {
      return;
    }
    unsubscribeMessages = subscribeState("messages", handleMessagesChange);
  };

export const renderMessagesView = (): void => {
  ensureMessagesSubscription();
  renderMessagesFromState();
};
