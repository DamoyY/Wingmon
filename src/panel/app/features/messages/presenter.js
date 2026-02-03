import {
  addMessage,
  state,
  subscribeState,
  updateMessage,
} from "../../../state/index.js";
import {
  animateMessageRemoval,
  renderMessages,
  updateLastAssistantMessage,
} from "../../../ui/index.ts";
import createMessageActionHandlers from "./actions.js";

let actionHandlers = null,
  unsubscribeMessages = null;

const refreshMessages = () => {
    if (!actionHandlers) {
      throw new Error("消息操作处理器尚未初始化");
    }
    renderMessages(state.messages, actionHandlers);
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
    for (let i = lastVisibleIndex; i >= 0; i -= 1) {
      const message = state.messages[i];
      if (message && !message.hidden) {
        if (message.role !== "assistant") {
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
      renderMessages(state.messages, ensureActionHandlers(), {
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
      const updated = updateLastAssistantMessage(state.messages);
      if (updated) {
        return;
      }
    }
    renderMessages(state.messages, ensureActionHandlers());
  },
  ensureMessagesSubscription = () => {
    if (unsubscribeMessages) {
      return;
    }
    unsubscribeMessages = subscribeState("messages", handleMessagesChange);
  };

export const renderMessagesView = () => {
  ensureMessagesSubscription();
  renderMessages(state.messages, ensureActionHandlers());
};

export const appendAssistantDelta = (delta) => {
  if (!delta) {
    return;
  }
  ensureMessagesSubscription();
  const lastIndex = state.messages.length - 1,
    last = state.messages[lastIndex];
  if (!last || last.role !== "assistant") {
    addMessage({ role: "assistant", content: delta });
    return;
  }
  updateMessage(lastIndex, {
    content: `${last.content || ""}${delta}`,
  });
};
