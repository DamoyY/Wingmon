import { messagesEl, newChatButton } from "./elements.js";
import { renderMarkdown } from "../markdown/index.js";

const ensureNewChatButton = () => {
  if (!newChatButton) {
    throw new Error("新建对话按钮未找到");
  }
  return newChatButton;
};

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

const createActionButton = ({ icon, className, title, onClick }) => {
  const button = document.createElement("md-icon-button");
  button.className = className;
  button.title = title;
  button.setAttribute("aria-label", title);
  const iconEl = document.createElement("md-icon");
  iconEl.textContent = icon;
  button.appendChild(iconEl);
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
    icon: "content_copy",
    className: "message-action message-copy",
    title: "复制",
    onClick: () => runAction(onCopy, index, onError),
  });
  const deleteButton = createActionButton({
    icon: "delete",
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
  let hasVisibleMessages = false;
  messagesEl.innerHTML = "";
  messages.forEach((msg, index) => {
    if (msg.hidden) {
      return;
    }
    hasVisibleMessages = true;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role}`;
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    row.appendChild(node);
    row.appendChild(createMessageActions(index, handlers));
    messagesEl.appendChild(row);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
  const button = ensureNewChatButton();
  button.classList.toggle("hidden", !hasVisibleMessages);
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
