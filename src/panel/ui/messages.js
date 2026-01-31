import { elements } from "./elements.js";
import {
  renderMarkdown,
  highlightCodeBlocks,
  renderMath,
} from "../markdown/index.js";
import { combineMessageContents, t } from "../utils/index.js";

const FADE_OUT_DURATION = 100;
const FADE_OUT_EASING = "cubic-bezier(0.2, 0, 0, 1)";
let fadePromise = null;
let activeAnimation = null;
const headingClassMap = new Map([
  ["H1", "md-typescale-headline-medium"],
  ["H2", "md-typescale-headline-small"],
  ["H3", "md-typescale-title-large"],
  ["H4", "md-typescale-title-medium"],
  ["H5", "md-typescale-title-small"],
  ["H6", "md-typescale-body-medium"],
]);

const ensureElement = (element, label) => {
  if (!(element instanceof Element)) {
    throw new Error(`${label}无效`);
  }
  return element;
};

const applyHeadingClasses = (container) => {
  const target = ensureElement(container, "消息内容容器");
  target.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const className = headingClassMap.get(heading.tagName);
    if (!className) {
      throw new Error(`未找到标题样式映射：${heading.tagName}`);
    }
    heading.classList.add(className);
  });
};

const ensureMessagesElement = () => {
  if (!elements.messagesEl) {
    throw new Error("消息容器未找到");
  }
  return elements.messagesEl;
};

const ensureNewChatButton = () => {
  if (!elements.newChatButton) {
    throw new Error("新建对话按钮未找到");
  }
  return elements.newChatButton;
};

const ensureEmptyState = () => {
  if (!elements.emptyState) {
    throw new Error("空状态容器未找到");
  }
  return elements.emptyState;
};

const setEmptyStateVisible = (visible) => {
  const container = ensureEmptyState();
  container.classList.toggle("is-visible", visible);
};

const ensureHandler = (handler, label) => {
  if (typeof handler !== "function") {
    throw new Error(`消息操作处理器缺失：${label}`);
  }
  return handler;
};

const runAction = async (handler, indices, onError) => {
  try {
    await handler(indices);
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

const createMessageActions = (indices, handlers) => {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("消息索引无效");
  }
  const onCopy = ensureHandler(handlers?.onCopy, t("copy"));
  const onDelete = ensureHandler(handlers?.onDelete, t("delete"));
  const onError = ensureHandler(handlers?.onError, t("error"));
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const copyButton = createActionButton({
    icon: "content_copy",
    className: "message-action message-copy",
    title: t("copy"),
    onClick: () => runAction(onCopy, indices, onError),
  });
  const deleteButton = createActionButton({
    icon: "delete",
    className: "message-action message-delete",
    title: t("delete"),
    onClick: () => runAction(onDelete, indices, onError),
  });
  actions.append(copyButton, deleteButton);
  return actions;
};

const createMessageContent = (content) => {
  if (typeof content !== "string") {
    throw new Error("消息内容格式无效");
  }
  const body = document.createElement("div");
  body.className = "message-content md-typescale-body-medium";
  body.innerHTML = renderMarkdown(content);
  applyHeadingClasses(body);
  renderMath(body);
  highlightCodeBlocks(body);
  return body;
};

const resolveMessageContent = (content, role) => {
  if (content === null || content === undefined) {
    return "";
  }
  if (typeof content !== "string") {
    const label = role ? `：${role}` : "";
    throw new Error(`消息内容格式无效${label}`);
  }
  return content;
};

const buildDisplayMessages = (messages) => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  const entries = [];
  let assistantGroup = null;
  const flushAssistantGroup = () => {
    if (!assistantGroup) {
      return;
    }
    const content = combineMessageContents(assistantGroup.contents);
    if (content) {
      entries.push({
        role: "assistant",
        content,
        indices: assistantGroup.indices,
      });
    }
    assistantGroup = null;
  };
  messages.forEach((msg, index) => {
    if (!msg || typeof msg !== "object") {
      throw new Error("消息格式无效");
    }
    if (msg.hidden) {
      return;
    }
    const content = resolveMessageContent(msg.content, msg.role);
    if (msg.role === "assistant") {
      if (!assistantGroup) {
        assistantGroup = { contents: [], indices: [] };
      }
      assistantGroup.contents.push(content);
      assistantGroup.indices.push(index);
      return;
    }
    flushAssistantGroup();
    entries.push({ role: msg.role, content, indices: [index] });
  });
  flushAssistantGroup();
  return entries;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const fadeOutMessages = async () => {
  const container = ensureMessagesElement();
  const hasMessages = Boolean(container.querySelector(".message-row"));
  if (!hasMessages) {
    return false;
  }
  if (prefersReducedMotion()) {
    return true;
  }
  if (fadePromise) {
    await fadePromise;
    return true;
  }
  activeAnimation = container.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FADE_OUT_DURATION,
    easing: FADE_OUT_EASING,
    fill: "both",
  });
  fadePromise = (async () => {
    try {
      await activeAnimation.finished;
    } finally {
      container.style.opacity = "0";
      activeAnimation.cancel();
      activeAnimation = null;
      fadePromise = null;
    }
  })();
  await fadePromise;
  return true;
};

export const resetMessagesFade = () => {
  const container = ensureMessagesElement();
  if (activeAnimation) {
    activeAnimation.cancel();
    activeAnimation = null;
    fadePromise = null;
  }
  container.style.opacity = "";
};

export const renderMessages = (messages, handlers) => {
  if (!handlers || typeof handlers !== "object") {
    throw new Error("消息操作处理器缺失");
  }
  const { messagesEl } = elements;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  let hasVisibleMessages = false;
  const displayMessages = buildDisplayMessages(messages);
  messagesEl.innerHTML = "";
  displayMessages.forEach((msg) => {
    hasVisibleMessages = true;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role}`;
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    row.appendChild(node);
    row.appendChild(createMessageActions(msg.indices, handlers));
    messagesEl.appendChild(row);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
  const button = ensureNewChatButton();
  button.classList.toggle("hidden", !hasVisibleMessages);
  setEmptyStateVisible(!hasVisibleMessages);
};

export const updateLastAssistantMessage = (messages) => {
  const { messagesEl } = elements;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  const displayMessages = buildDisplayMessages(messages);
  const lastEntry = displayMessages[displayMessages.length - 1];
  if (!lastEntry || lastEntry.role !== "assistant") {
    return false;
  }
  const lastEl = messagesEl.lastElementChild;
  if (!lastEl || !lastEl.classList.contains("assistant")) {
    return false;
  }
  const contentEl = lastEl.querySelector(".message-content");
  if (!contentEl) {
    return false;
  }
  contentEl.innerHTML = renderMarkdown(lastEntry.content);
  applyHeadingClasses(contentEl);
  renderMath(contentEl);
  highlightCodeBlocks(contentEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
