import { state, subscribeState } from "../../../state/index.js";
import {
  animateMessageRemoval,
  renderMessages,
  updateLastAssistantMessage,
} from "../../../ui/index.ts";
import createMessageActionHandlers from "./actions.js";
import { buildDisplayMessages } from "./displayMessages.ts";

let actionHandlers = null,
  unsubscribeMessages = null;

const buildMessagesForView = () => buildDisplayMessages(state.messages),
  refreshMessages = () => {
    if (!actionHandlers) {
      throw new Error("消息操作处理器尚未初始化");
    }
    renderMessages(buildMessagesForView(), actionHandlers);
  },
  renderMessagesFromState = (options) => {
    renderMessages(buildMessagesForView(), ensureActionHandlers(), options);
  },
  ensureActionHandlers = () => {
    if (!actionHandlers) {
      actionHandlers = createMessageActionHandlers(
        refreshMessages,
        animateMessageRemoval,
      );
    }
    return actionHandlers;
  },
  resolveAssistantGroupId = (message, index) => {
    if (message && typeof message.groupId === "string") {
      const trimmed = message.groupId.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return String(index);
  },
  isInLastAssistantGroup = (index) => {
    if (!Number.isInteger(index) || index < 0) {
      return false;
    }
    let lastVisibleIndex = null;
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (message && !message.hidden) {
        lastVisibleIndex = i;
        break;
      }
    }
    if (lastVisibleIndex === null) {
      return false;
    }
    const lastVisible = state.messages[lastVisibleIndex];
    if (!lastVisible || lastVisible.role !== "assistant") {
      return false;
    }
    const lastGroupId = resolveAssistantGroupId(lastVisible, lastVisibleIndex);
    for (let i = lastVisibleIndex; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (message && !message.hidden) {
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
  handleMessagesChange = (change) => {
    if (!change) {
      return;
    }
    if (change.type === "add") {
      if (change.message?.hidden) {
        return;
      }
      const previousRole = (() => {
          for (let i = change.index - 1; i >= 0; i -= 1) {
            const message = state.messages[i];
            if (message && !message.hidden) {
              return message.role;
            }
          }
          return null;
        })(),
        shouldAnimate =
          change.message?.role === "user" ||
          (change.message?.role === "assistant" &&
            previousRole !== "assistant");
      renderMessagesFromState({
        animateIndices: shouldAnimate ? [change.index] : undefined,
      });
      return;
    }
    if (change.type === "remove" && change.message?.hidden) {
      return;
    }
    if (
      change.type === "update" &&
      change.message?.role === "assistant" &&
      isInLastAssistantGroup(change.index)
    ) {
      const displayMessages = buildMessagesForView();
      const lastEntry = displayMessages.at(-1);
      const updated = updateLastAssistantMessage(lastEntry);
      if (updated) {
        return;
      }
      renderMessages(displayMessages, ensureActionHandlers());
      return;
    }
    renderMessagesFromState();
  },
  ensureMessagesSubscription = () => {
    if (unsubscribeMessages) {
      return;
    }
    unsubscribeMessages = subscribeState("messages", handleMessagesChange);
  };

export const renderMessagesView = () => {
  ensureMessagesSubscription();
  renderMessagesFromState();
};
