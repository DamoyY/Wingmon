import { elements } from "../core/elements.js";
import renderMessageContent from "./contentRenderer.js";
import { animateMessageRowEnter } from "./animations.js";
import { resolveIndicesKey } from "./messageIndices.js";
import { applyMessageHeadingTypography } from "../theme/typography.js";
import { combineMessageContents, t } from "../../utils/index.js";

const ensureNewChatButton = () => {
    if (!elements.newChatButton) {
      throw new Error("新建对话按钮未找到");
    }
    return elements.newChatButton;
  },
  ensureEmptyState = () => {
    if (!elements.emptyState) {
      throw new Error("空状态容器未找到");
    }
    return elements.emptyState;
  },
  setEmptyStateVisible = (visible) => {
    const container = ensureEmptyState();
    container.classList.toggle("is-visible", visible);
  },
  ensureHandler = (handler, label) => {
    if (typeof handler !== "function") {
      throw new Error(`消息操作处理器缺失：${label}`);
    }
    return handler;
  },
  runAction = async (handler, indices, onError) => {
    try {
      await handler(indices);
    } catch (error) {
      onError(error);
    }
  },
  createActionButton = ({ icon, className, title, onClick }) => {
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
  },
  createMessageActions = (indices, handlers) => {
    if (!Array.isArray(indices) || indices.length === 0) {
      throw new Error("消息索引无效");
    }
    const onCopy = ensureHandler(handlers?.onCopy, t("copy")),
      onDelete = ensureHandler(handlers?.onDelete, t("delete")),
      onError = ensureHandler(handlers?.onError, t("error")),
      actions = document.createElement("div");
    actions.className = "message-actions";
    const copyButton = createActionButton({
        icon: "content_copy",
        className: "message-action message-copy",
        title: t("copy"),
        onClick: () => runAction(onCopy, indices, onError),
      }),
      deleteButton = createActionButton({
        icon: "delete",
        className: "message-action message-delete",
        title: t("delete"),
        onClick: () => runAction(onDelete, indices, onError),
      });
    actions.append(copyButton, deleteButton);
    return actions;
  },
  createMessageContent = (content) => {
    const body = document.createElement("div");
    body.className = "message-content md-typescale-body-medium";
    const { html, text } = renderMessageContent(content, {
      decorateContainer: applyMessageHeadingTypography,
    });
    body.innerHTML = html;
    body.dataset.renderedText = text;
    return body;
  },
  resolveMessageContent = (content, role) => {
    if (content === null || content === undefined) {
      return "";
    }
    if (typeof content !== "string") {
      const label = role ? `：${role}` : "";
      throw new Error(`消息内容格式无效${label}`);
    }
    return content;
  },
  wrapTrailingText = (container, length) => {
    if (!Number.isInteger(length) || length <= 0) {
      return;
    }
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT),
      nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }
    let remaining = length;
    for (let i = nodes.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const node = nodes[i],
        value = node.nodeValue || "";
      if (value) {
        const take = Math.min(remaining, value.length),
          splitIndex = value.length - take,
          beforeText = value.slice(0, splitIndex),
          targetText = value.slice(splitIndex),
          parent = node.parentNode;
        if (parent) {
          if (beforeText) {
            parent.insertBefore(document.createTextNode(beforeText), node);
          }
          const span = document.createElement("span");
          span.className = "stream-delta";
          span.textContent = targetText;
          parent.insertBefore(span, node);
          parent.removeChild(node);
          remaining -= take;
        }
      }
    }
  },
  resolveCommonPrefixLength = (previousText, nextText) => {
    if (!previousText || !nextText) {
      return 0;
    }
    const max = Math.min(previousText.length, nextText.length);
    let index = 0;
    while (index < max && previousText[index] === nextText[index]) {
      index += 1;
    }
    return index;
  },
  buildDisplayMessages = (messages) => {
    if (!Array.isArray(messages)) {
      throw new Error("messages 必须是数组");
    }
    const entries = [];
    let assistantGroup = null,
      hasToolBridge = false;
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
        hasToolBridge = false;
      },
      startAssistantGroup = (content, index) => {
        assistantGroup = { contents: [content], indices: [index] };
      };
    messages.forEach((msg, index) => {
      if (!msg || typeof msg !== "object") {
        throw new Error("消息格式无效");
      }
      if (msg.hidden) {
        if (msg.role === "tool" && assistantGroup) {
          hasToolBridge = true;
        }
        return;
      }
      const content = resolveMessageContent(msg.content, msg.role);
      if (msg.role === "assistant") {
        if (!assistantGroup) {
          startAssistantGroup(content, index);
          return;
        }
        if (hasToolBridge) {
          assistantGroup.contents.push(content);
          assistantGroup.indices.push(index);
          hasToolBridge = false;
          return;
        }
        flushAssistantGroup();
        startAssistantGroup(content, index);
        return;
      }
      flushAssistantGroup();
      entries.push({ role: msg.role, content, indices: [index] });
    });
    flushAssistantGroup();
    return entries;
  };

export const renderMessages = (messages, handlers, options = {}) => {
  if (!handlers || typeof handlers !== "object") {
    throw new Error("消息操作处理器缺失");
  }
  const { messagesEl } = elements;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  let hasVisibleMessages = false;
  const displayMessages = buildDisplayMessages(messages),
    animateKey =
      options?.animateIndices !== undefined
        ? resolveIndicesKey(options.animateIndices)
        : null,
    rowsToAnimate = [];
  messagesEl.innerHTML = "";
  displayMessages.forEach((msg) => {
    hasVisibleMessages = true;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role}`;
    row.dataset.indices = resolveIndicesKey(msg.indices);
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    row.appendChild(node);
    row.appendChild(createMessageActions(msg.indices, handlers));
    messagesEl.appendChild(row);
    if (animateKey && row.dataset.indices === animateKey) {
      rowsToAnimate.push(row);
    }
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
  rowsToAnimate.forEach((row) => {
    animateMessageRowEnter(row);
  });
  const button = ensureNewChatButton();
  button.classList.toggle("hidden", !hasVisibleMessages);
  setEmptyStateVisible(!hasVisibleMessages);
};

export const updateLastAssistantMessage = (messages) => {
  const { messagesEl } = elements;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  const displayMessages = buildDisplayMessages(messages),
    lastEntry = displayMessages[displayMessages.length - 1];
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
  const previousRenderedText = contentEl.dataset.renderedText || "",
    { html, text } = renderMessageContent(lastEntry.content, {
      decorateContainer: applyMessageHeadingTypography,
    });
  contentEl.innerHTML = html;
  const newRenderedText = text,
    commonPrefixLength = resolveCommonPrefixLength(
      previousRenderedText,
      newRenderedText,
    ),
    appendedLength = newRenderedText.length - commonPrefixLength;
  wrapTrailingText(contentEl, appendedLength);
  contentEl.dataset.renderedText = newRenderedText;
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
