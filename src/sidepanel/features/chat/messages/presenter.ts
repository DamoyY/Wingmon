import {
  type DisplayMessage,
  buildDisplayMessages,
} from "./displayMessages.ts";
import {
  type MessageRecord,
  type StateChangePayload,
  state,
  subscribeState,
} from "../../../../shared/state/panelStateContext.ts";
import {
  animateMessageRemoval,
  renderMessages,
  restoreMessageRemoval,
  updateLastAssistantMessage,
} from "../../../ui/index.ts";
import createMessageActionHandlers, {
  type MessageActionHandlers,
} from "./actions.ts";

type RenderMessagesOptions = { animateIndices?: number[] };

type MessagesStateChange = StateChangePayload<"messages"> & {
  type?: string;
  index?: number;
  message?: MessageRecord;
};

let actionHandlers: MessageActionHandlers | null = null;
let unsubscribeMessages: (() => void) | null = null;
let unsubscribeActiveStatus: (() => void) | null = null;
let unsubscribeSending: (() => void) | null = null;
let hasRenderedMessageList = false;
let renderedMessageKeys: string[] = [];
const buildMessagesForView = (): DisplayMessage[] =>
    buildDisplayMessages(state.messages, state.activeStatus),
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
  resolveLastDisplayMessage = (
    displayMessages: readonly DisplayMessage[],
  ): DisplayMessage | null => {
    if (displayMessages.length === 0) {
      return null;
    }
    return displayMessages[displayMessages.length - 1];
  },
  updateRenderedMessageState = (
    displayMessages: readonly DisplayMessage[],
  ): void => {
    renderedMessageKeys = displayMessages.map((message) => message.renderKey);
    hasRenderedMessageList = true;
  },
  resolveAppendedAnimateIndices = (
    displayMessages: readonly DisplayMessage[],
  ): number[] | undefined => {
    const previousKeys = new Set(renderedMessageKeys);
    const appendedEntries = displayMessages.filter(
      (message) => !previousKeys.has(message.renderKey),
    );
    if (appendedEntries.length !== 1) {
      return undefined;
    }
    const appended = appendedEntries[0];
    const lastEntry = resolveLastDisplayMessage(displayMessages);
    if (!lastEntry || lastEntry.renderKey !== appended.renderKey) {
      return undefined;
    }
    if (appended.role !== "assistant" && appended.role !== "user") {
      return undefined;
    }
    if (appended.role === "assistant" && appended.content.trim().length === 0) {
      return undefined;
    }
    return appended.indices;
  },
  resolveAutoAnimateIndices = (
    displayMessages: readonly DisplayMessage[],
    options?: RenderMessagesOptions,
  ): number[] | undefined => {
    if (options?.animateIndices !== undefined) {
      return options.animateIndices;
    }
    if (!hasRenderedMessageList) {
      return undefined;
    }
    return resolveAppendedAnimateIndices(displayMessages);
  },
  renderDisplayMessages = (
    displayMessages: DisplayMessage[],
    options?: RenderMessagesOptions,
  ): void => {
    const animateIndices = resolveAutoAnimateIndices(displayMessages, options);
    renderMessages(displayMessages, ensureActionHandlers(), {
      animateIndices,
      showNewChatButton: !state.sending,
    });
    updateRenderedMessageState(displayMessages);
  },
  refreshMessages = (): void => {
    renderMessagesFromState();
  },
  ensureActionHandlers = (): MessageActionHandlers => {
    if (!actionHandlers) {
      actionHandlers = createMessageActionHandlers(
        refreshMessages,
        animateMessageRemoval,
        restoreMessageRemoval,
      );
    }
    return actionHandlers;
  },
  renderMessagesFromState = (options?: RenderMessagesOptions): void => {
    renderDisplayMessages(buildMessagesForView(), options);
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
      const lastEntry = resolveLastDisplayMessage(displayMessages);
      const updated = updateLastAssistantMessage(lastEntry);
      if (updated) {
        updateRenderedMessageState(displayMessages);
        return;
      }
      renderDisplayMessages(displayMessages);
      return;
    }
    renderMessagesFromState();
  },
  handleActiveStatusChange = (): void => {
    const displayMessages = buildMessagesForView();
    const lastEntry = resolveLastDisplayMessage(displayMessages);
    const updated = updateLastAssistantMessage(lastEntry);
    if (updated) {
      updateRenderedMessageState(displayMessages);
      return;
    }
    renderDisplayMessages(displayMessages);
  },
  handleSendingChange = (): void => {
    renderMessagesFromState();
  },
  ensureStateSubscriptions = (): void => {
    if (!unsubscribeMessages) {
      unsubscribeMessages = subscribeState("messages", handleMessagesChange);
    }
    if (!unsubscribeActiveStatus) {
      unsubscribeActiveStatus = subscribeState(
        "activeStatus",
        handleActiveStatusChange,
      );
    }
    if (!unsubscribeSending) {
      unsubscribeSending = subscribeState("sending", handleSendingChange);
    }
  };

export const renderMessagesView = (): void => {
  ensureStateSubscriptions();
  renderMessagesFromState();
};
