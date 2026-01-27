import { addMessage, state, updateMessage } from "../state/index.js";
import { renderMessages, updateLastAssistantMessage } from "../ui/index.js";
import createMessageActionHandlers from "./messageActions.js";

let actionHandlers = null;

const refreshMessages = () => {
  if (!actionHandlers) {
    throw new Error("消息操作处理器尚未初始化");
  }
  renderMessages(state.messages, actionHandlers);
};

const ensureActionHandlers = () => {
  if (!actionHandlers) {
    actionHandlers = createMessageActionHandlers(refreshMessages);
  }
  return actionHandlers;
};

export const renderMessagesView = () => {
  renderMessages(state.messages, ensureActionHandlers());
};

export const appendAssistantDelta = (delta) => {
  if (!delta) {
    return;
  }
  const lastIndex = state.messages.length - 1;
  const last = state.messages[lastIndex];
  if (!last || last.role !== "assistant") {
    addMessage({ role: "assistant", content: delta });
    renderMessagesView();
    return;
  }
  const updated = updateMessage(lastIndex, {
    content: `${last.content || ""}${delta}`,
  });
  const updatedView =
    !updated.hidden && updateLastAssistantMessage(updated.content);
  if (!updatedView) {
    renderMessagesView();
  }
};
