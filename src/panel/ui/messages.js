import { messagesEl, statusEl } from "./elements.js";
import setText from "./text.js";
import renderMarkdown from "../markdown/renderer.js";
import {
  state,
  addMessage,
  updateMessage,
  removeMessage,
  touchUpdatedAt,
} from "../state/store.js";
import { saveConversation, deleteConversation } from "../services/history.js";

const setStatus = (text) => {
  if (!statusEl) {
    return;
  }
  setText(statusEl, text);
};

const clearStatusLater = (text) => {
  window.setTimeout(() => {
    if (state.sending) {
      return;
    }
    if (statusEl?.textContent === text) {
      setStatus("");
    }
  }, 1500);
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
    clearStatusLater("已复制");
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

const createActionButton = ({ label, className, title, onClick }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      await onClick();
    } catch (error) {
      reportActionError(error);
    }
  });
  return button;
};

const createMessageActions = (index, refreshMessages) => {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const copyButton = createActionButton({
    label: "复制",
    className: "message-action message-copy",
    title: "复制",
    onClick: () => handleCopyMessage(index),
  });
  const deleteButton = createActionButton({
    label: "删除",
    className: "message-action message-delete",
    title: "删除",
    onClick: () => handleDeleteMessage(index, refreshMessages),
  });
  actions.append(copyButton, deleteButton);
  return actions;
};

const createMessageContent = (content) => {
  const body = document.createElement("div");
  body.className = "message-content";
  body.innerHTML = renderMarkdown(content);
  return body;
};

export function renderMessages() {
  messagesEl.innerHTML = "";
  state.messages.forEach((msg, index) => {
    if (msg.hidden) {
      return;
    }
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    node.appendChild(createMessageActions(index, renderMessages));
    messagesEl.appendChild(node);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
export const appendAssistantDelta = (delta) => {
  if (!delta) {
    return;
  }
  const lastIndex = state.messages.length - 1;
  const last = state.messages[lastIndex];
  if (!last || last.role !== "assistant") {
    addMessage({ role: "assistant", content: delta });
    renderMessages();
    return;
  }
  const updated = updateMessage(lastIndex, {
    content: `${last.content || ""}${delta}`,
  });
  const lastEl = messagesEl.lastElementChild;
  if (lastEl && lastEl.classList.contains("assistant") && !updated.hidden) {
    const contentEl = lastEl.querySelector(".message-content");
    if (!contentEl) {
      renderMessages();
      return;
    }
    contentEl.innerHTML = renderMarkdown(updated.content);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return;
  }
  renderMessages();
};
