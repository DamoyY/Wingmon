import { elements } from "../core/elements.ts";
import renderMessageContent from "./contentRenderer.js";
import { animateMessageRowEnter } from "./animations.js";
import { resolveIndicesKey } from "./messageIndices.js";
import { applyMessageHeadingTypography } from "../theme/typography.ts";
import { combineMessageContents, t } from "../../utils/index.ts";

type RenderedContent = { html: string; text: string };

const renderMessageContentSafe = renderMessageContent as (
  content: string,
  options?: { decorateContainer?: (container: HTMLElement) => void },
) => RenderedContent;
const animateMessageRowEnterSafe = animateMessageRowEnter as (
  row: HTMLElement,
) => void;
const resolveIndicesKeySafe = resolveIndicesKey as (
  indices: number[],
) => string;
const combineMessageContentsSafe = combineMessageContents as (
  segments: string[],
) => string;

type MessageEntry = {
  role?: unknown;
  content?: unknown;
  hidden?: boolean;
  pending?: boolean;
  status?: unknown;
};

type MessageList = Array<MessageEntry | null | undefined>;

type DisplayMessage = {
  role: string;
  content: string;
  indices: number[];
  status?: string;
};

type MessageActionHandler = (indices: number[]) => Promise<void> | void;

type MessageErrorHandler = (error: unknown) => void;

type MessageActionHandlers = {
  onCopy?: MessageActionHandler;
  onDelete?: MessageActionHandler;
  onError?: MessageErrorHandler;
};

type ActionButtonConfig = {
  icon: string;
  className: string;
  title: string;
  onClick: () => Promise<void> | void;
};

type RenderOptions = {
  animateIndices?: number[];
};

const ensureNewChatButton = (): HTMLElement => {
    const { newChatButton } = elements as Partial<typeof elements>;
    if (!newChatButton) {
      throw new Error("新建对话按钮未找到");
    }
    return newChatButton;
  },
  ensureEmptyState = (): HTMLElement => {
    const { emptyState } = elements as Partial<typeof elements>;
    if (!emptyState) {
      throw new Error("空状态容器未找到");
    }
    return emptyState;
  },
  setEmptyStateVisible = (visible: boolean): void => {
    const container = ensureEmptyState();
    container.classList.toggle("is-visible", visible);
  },
  ensureActionHandler = (
    handler: unknown,
    label: string,
  ): MessageActionHandler => {
    if (typeof handler !== "function") {
      throw new Error(`消息操作处理器缺失：${label}`);
    }
    return handler as MessageActionHandler;
  },
  ensureErrorHandler = (
    handler: unknown,
    label: string,
  ): MessageErrorHandler => {
    if (typeof handler !== "function") {
      throw new Error(`消息操作处理器缺失：${label}`);
    }
    return handler as MessageErrorHandler;
  },
  runAction = async (
    handler: MessageActionHandler,
    indices: number[],
    onError: MessageErrorHandler,
  ): Promise<void> => {
    try {
      await handler(indices);
    } catch (error) {
      onError(error);
    }
  },
  createActionButton = ({
    icon,
    className,
    title,
    onClick,
  }: ActionButtonConfig): HTMLElement => {
    const button = document.createElement("md-icon-button");
    button.className = className;
    button.title = title;
    button.setAttribute("aria-label", title);
    const iconEl = document.createElement("md-icon");
    iconEl.textContent = icon;
    button.appendChild(iconEl);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void onClick();
    });
    return button;
  },
  createMessageActions = (
    indices: number[],
    handlers: MessageActionHandlers,
  ): HTMLDivElement => {
    if (!Array.isArray(indices) || indices.length === 0) {
      throw new Error("消息索引无效");
    }
    const onCopy = ensureActionHandler(handlers.onCopy, t("copy")),
      onDelete = ensureActionHandler(handlers.onDelete, t("delete")),
      onError = ensureErrorHandler(handlers.onError, t("error")),
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
  createMessageContent = (content: string): HTMLDivElement => {
    const body = document.createElement("div");
    body.className = "message-content md-typescale-body-medium";
    const { html, text } = renderMessageContentSafe(content, {
      decorateContainer: applyMessageHeadingTypography,
    });
    body.innerHTML = html;
    body.setAttribute("data-rendered-text", text);
    return body;
  },
  resolveMessageRole = (role: unknown): string => {
    if (role === null || role === undefined) {
      return "";
    }
    if (typeof role !== "string") {
      throw new Error("消息角色格式无效");
    }
    return role;
  },
  resolveMessageContent = (content: unknown, role: string): string => {
    if (content === null || content === undefined) {
      return "";
    }
    if (typeof content !== "string") {
      const label = role ? `：${role}` : "";
      throw new Error(`消息内容格式无效${label}`);
    }
    return content;
  },
  resolveMessageStatus = (status: unknown, role: string): string => {
    if (status === null || status === undefined) {
      return "";
    }
    if (typeof status !== "string") {
      const label = role ? `：${role}` : "";
      throw new Error(`状态内容格式无效${label}`);
    }
    return status;
  },
  createMessageStatusLine = (statusText: string): HTMLDivElement | null => {
    if (!statusText) {
      return null;
    }
    const status = document.createElement("div");
    status.className = "message-status status md-typescale-label-small";
    status.textContent = statusText;
    return status;
  },
  updateMessageStatusLine = (
    messageEl: HTMLElement,
    statusText: string,
  ): void => {
    const existing = messageEl.querySelector(".message-status");
    if (!statusText) {
      if (existing) {
        existing.remove();
      }
      return;
    }
    if (existing) {
      if (existing.textContent !== statusText) {
        existing.textContent = statusText;
      }
      return;
    }
    const status = createMessageStatusLine(statusText);
    if (status) {
      messageEl.appendChild(status);
    }
  },
  wrapTrailingText = (container: HTMLElement, length: number): void => {
    if (!Number.isInteger(length) || length <= 0) {
      return;
    }
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT),
      nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
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
  resolveCommonPrefixLength = (
    previousText: string,
    nextText: string,
  ): number => {
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
  buildDisplayMessages = (messages: MessageList): DisplayMessage[] => {
    if (!Array.isArray(messages)) {
      throw new Error("messages 必须是数组");
    }
    const entries: DisplayMessage[] = [];
    let assistantGroup: {
        contents: string[];
        indices: number[];
        hasPending: boolean;
        status: string;
      } | null = null,
      hasToolBridge = false;
    const flushAssistantGroup = () => {
        if (!assistantGroup) {
          return;
        }
        const content = combineMessageContentsSafe(assistantGroup.contents);
        if (content || assistantGroup.hasPending) {
          entries.push({
            role: "assistant",
            content,
            indices: assistantGroup.indices,
            status: assistantGroup.status,
          });
        }
        assistantGroup = null;
        hasToolBridge = false;
      },
      startAssistantGroup = (
        content: string,
        index: number,
        pending: boolean,
        status: string,
      ) => {
        assistantGroup = {
          contents: [content],
          indices: [index],
          hasPending: pending,
          status,
        };
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
      const role = resolveMessageRole(msg.role);
      const content = resolveMessageContent(msg.content, role);
      if (role === "assistant") {
        const isPending = msg.pending === true,
          status = resolveMessageStatus(msg.status, role);
        if (!assistantGroup) {
          startAssistantGroup(content, index, isPending, status);
          return;
        }
        if (hasToolBridge) {
          assistantGroup.contents.push(content);
          assistantGroup.indices.push(index);
          assistantGroup.hasPending = assistantGroup.hasPending || isPending;
          assistantGroup.status = status;
          hasToolBridge = false;
          return;
        }
        flushAssistantGroup();
        startAssistantGroup(content, index, isPending, status);
        return;
      }
      flushAssistantGroup();
      entries.push({ role, content, indices: [index] });
    });
    flushAssistantGroup();
    return entries;
  };

export const renderMessages = (
  messages: MessageList,
  handlers: MessageActionHandlers | null | undefined,
  options: RenderOptions = {},
): void => {
  if (!handlers || typeof handlers !== "object") {
    throw new Error("消息操作处理器缺失");
  }
  const { messagesEl } = elements as Partial<typeof elements>;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  let hasVisibleMessages = false;
  const displayMessages = buildDisplayMessages(messages),
    animateKey =
      options.animateIndices !== undefined
        ? resolveIndicesKeySafe(options.animateIndices)
        : null,
    rowsToAnimate: HTMLElement[] = [];
  messagesEl.innerHTML = "";
  displayMessages.forEach((msg) => {
    hasVisibleMessages = true;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role}`;
    row.dataset.indices = resolveIndicesKeySafe(msg.indices);
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.appendChild(createMessageContent(msg.content));
    const status = createMessageStatusLine(msg.status || "");
    if (status) {
      node.appendChild(status);
    }
    row.appendChild(node);
    row.appendChild(createMessageActions(msg.indices, handlers));
    messagesEl.appendChild(row);
    if (animateKey && row.dataset.indices === animateKey) {
      rowsToAnimate.push(row);
    }
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
  rowsToAnimate.forEach((row) => {
    animateMessageRowEnterSafe(row);
  });
  const button = ensureNewChatButton();
  button.classList.toggle("hidden", !hasVisibleMessages);
  setEmptyStateVisible(!hasVisibleMessages);
};

export const updateLastAssistantMessage = (messages: MessageList): boolean => {
  const { messagesEl } = elements as Partial<typeof elements>;
  if (!messagesEl) {
    throw new Error("消息容器未找到");
  }
  const displayMessages = buildDisplayMessages(messages),
    lastEntry = displayMessages.at(-1);
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
  const previousRenderedText =
      contentEl.getAttribute("data-rendered-text") ?? "",
    { html, text } = renderMessageContentSafe(lastEntry.content, {
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
  contentEl.setAttribute("data-rendered-text", newRenderedText);
  const messageEl = contentEl.parentElement;
  if (!messageEl) {
    return false;
  }
  updateMessageStatusLine(messageEl, lastEntry.status || "");
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return true;
};
