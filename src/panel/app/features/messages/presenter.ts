import {
  type MessageRecord,
  type StateChangePayload,
  state,
  subscribeState,
} from "../../../state/index.ts";
import {
  animateMessageRemoval,
  renderMessages,
  updateLastAssistantMessage,
} from "../../../ui/index.ts";
import createMessageActionHandlers from "./actions.js";
import {
  buildDisplayMessages,
  type DisplayMessage,
} from "./displayMessages.ts";

type MessageActionHandlers = {
  onCopy?: (indices: number[]) => Promise<void> | void;
  onDelete?: (indices: number[]) => Promise<void> | void;
  onError?: (error: unknown) => void;
};

type RenderMessagesOptions = {
  animateIndices?: number[];
};

type MessagesStateChange = StateChangePayload<"messages"> & {
  type?: string;
  index?: number;
  message?: MessageRecord;
};

const renderMessagesSafe = renderMessages as (
  displayMessages: DisplayMessage[],
  handlers: MessageActionHandlers,
  options?: RenderMessagesOptions,
) => void;

const updateLastAssistantMessageSafe = updateLastAssistantMessage as (
  message: DisplayMessage | null | undefined,
) => boolean;

const animateMessageRemovalSafe = animateMessageRemoval as (
  indices: number[],
) => Promise<boolean> | boolean;

const createMessageActionHandlersSafe = createMessageActionHandlers as (
  refreshMessages: () => void,
  animateRemoval: (indices: number[]) => Promise<boolean> | boolean,
) => MessageActionHandlers;

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
    renderMessagesSafe(buildMessagesForView(), actionHandlers);
  },
  ensureActionHandlers = (): MessageActionHandlers => {
    if (!actionHandlers) {
      actionHandlers = createMessageActionHandlersSafe(
        refreshMessages,
        animateMessageRemovalSafe,
      );
    }
    return actionHandlers;
  },
  renderMessagesFromState = (options?: RenderMessagesOptions): void => {
    renderMessagesSafe(buildMessagesForView(), ensureActionHandlers(), options);
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
              return message.role ?? null;
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
      const lastEntry = displayMessages.at(-1);
      const updated = updateLastAssistantMessageSafe(lastEntry);
      if (updated) {
        return;
      }
      renderMessagesSafe(displayMessages, ensureActionHandlers());
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
