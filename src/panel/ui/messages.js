import { messagesEl } from "./elements.js";
import { renderMarkdown } from "../markdown/index.js";

const ensureHandler = (handler, label) => {
  if (typeof handler !== "function") {
    throw new Error(`消息操作处理器缺失：${label}`);
  }
  return handler;
};

const runAction = async (handler, index, onError) => {
  try {
    await handler(index);
  } catch (error) {
    onError(error);
  }
};

const createActionButton = ({ label, className, title, onClick }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    await onClick();
  });
  return button;
};

const createMessageActions = (index, handlers) => {
  const onCopy = ensureHandler(handlers?.onCopy, "复制");
  const onDelete = ensureHandler(handlers?.onDelete, "删除");
  const onError = ensureHandler(handlers?.onError, "错误处理");
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const copyButton = createActionButton({
    label: "复制",
    className: "message-action message-copy",
    title: "复制",
    onClick: () => runAction(onCopy, index, onError),
  });
  const deleteButton = createActionButton({
    label: "删除",
    className: "message-action message-delete",
    title: "删除",
    onClick: () => runAction(onDelete, index, onError),
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

export const renderMessages = (messages, handlers) => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  if (!handlers || typeof handlers !== "object") {
    throw new Error("消息操作处理器缺失");
  }
  messagesEl.innerHTML = "";
  messages.forEach((msg, index) => {
    if (msg.hidden) {
      return;
    }
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    node.appendChild(createMessageActions(index, handlers));
    messagesEl.appendChild(node);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

export const updateLastAssistantMessage = (content) => {
  const lastEl = messagesEl.lastElementChild;
  if (!lastEl || !lastEl.classList.contains("assistant")) {
    return false;
  }
  const contentEl = lastEl.querySelector(".message-content");
  if (!contentEl) {
    return false;
  }
  contentEl.innerHTML = renderMarkdown(content);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
