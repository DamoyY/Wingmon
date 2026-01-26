export const state = { messages: [], sending: false, systemPrompt: null };
const byId = (id) => document.getElementById(id);
export const [
  keyView,
  chatView,
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
  keyStatus,
  openSettings,
  saveKey,
  cancelSettings,
  messagesEl,
  promptEl,
  sendButton,
  clearButton,
  statusEl,
  shareToggle,
] = [
  "key-view",
  "chat-view",
  "api-key-input",
  "base-url-input",
  "model-input",
  "api-type-select",
  "theme-select",
  "key-status",
  "open-settings",
  "save-key",
  "cancel-settings",
  "messages",
  "prompt",
  "send",
  "clear",
  "status",
  "share-page",
].map(byId);
export const markdown = window.markdownit({
  html: false,
  linkify: true,
  breaks: true,
});
const normalizeUrl = (url) =>
  (url || "").replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
const isSafeUrl = (url) => {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  if (normalized.startsWith("#")) return true;
  const schemeMatch = normalized.match(/^[a-z0-9+.-]+:/);
  if (!schemeMatch) return true;
  return (
    normalized.startsWith("http:") ||
    normalized.startsWith("https:") ||
    normalized.startsWith("mailto:")
  );
};
const isDataUrl = (url) => normalizeUrl(url).startsWith("data:");
const sanitizeRenderedHtml = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allElements = template.content.querySelectorAll("*");
  allElements.forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attr.name);
      }
    });
  });
  template.content.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!isSafeUrl(href)) {
      link.removeAttribute("href");
    }
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("target", "_blank");
  });
  template.content.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!isSafeUrl(src)) {
      img.removeAttribute("src");
    }
  });
  return template.innerHTML;
};
const renderMarkdown = (content) =>
  sanitizeRenderedHtml(markdown.render(content || ""));
export const turndown = new TurndownService({ codeBlockStyle: "fenced" });
turndown.remove(["script", "style"]);
turndown.addRule("image", {
  filter: "img",
  replacement: (_content, node) => {
    if (!node || node.nodeName !== "IMG") return "";
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "";
    if (!src || isDataUrl(src)) {
      return turndown.escape(alt);
    }
    const title = node.getAttribute("title");
    const titlePart = title ? ` "${turndown.escape(title)}"` : "";
    return `![${turndown.escape(alt)}](${src}${titlePart})`;
  },
});
export const convertPageContentToMarkdown = (pageData) => {
  if (!pageData || typeof pageData.html !== "string") {
    throw new Error("页面内容为空");
  }
  if (!pageData.html.trim()) {
    throw new Error("页面内容为空");
  }
  if (typeof DOMParser !== "function") {
    throw new Error("DOMParser 不可用，无法解析页面 HTML");
  }
  const parser = new DOMParser();
  const documentResult = parser.parseFromString(pageData.html, "text/html");
  if (!documentResult?.body) {
    throw new Error("解析页面 HTML 失败");
  }
  const normalizeText = (value) => (value || "").trim();
  const getLabelFromIds = (ids) => {
    const labels = ids.map((id) => {
      const target = documentResult.getElementById(id);
      if (!target) {
        throw new Error(`aria-labelledby 指向不存在的元素: ${id}`);
      }
      return normalizeText(target.textContent);
    });
    const merged = labels.filter(Boolean).join(" ").trim();
    return merged || "";
  };
  const getButtonLabel = (button) => {
    const directText =
      button.tagName === "INPUT" ? button.value : button.textContent;
    const normalizedText = normalizeText(directText);
    if (normalizedText) return normalizedText;
    const ariaLabel = normalizeText(button.getAttribute("aria-label"));
    if (ariaLabel) return ariaLabel;
    const ariaLabelledby = normalizeText(
      button.getAttribute("aria-labelledby"),
    );
    if (ariaLabelledby) {
      const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
      if (!ids.length) {
        throw new Error("aria-labelledby 为空，无法解析按钮名称");
      }
      const labeledText = getLabelFromIds(ids);
      if (labeledText) return labeledText;
    }
    const titleText = normalizeText(button.getAttribute("title"));
    if (titleText) return titleText;
    const imgAlt = normalizeText(
      button.querySelector("img")?.getAttribute("alt"),
    );
    if (imgAlt) return imgAlt;
    const svgTitle = normalizeText(
      button.querySelector("svg title")?.textContent,
    );
    if (svgTitle) return svgTitle;
    const svgLabel = normalizeText(
      button.querySelector("svg")?.getAttribute("aria-label"),
    );
    if (svgLabel) return svgLabel;
    return "未命名按钮";
  };
  const buttons = documentResult.body.querySelectorAll("[data-llm-id]");
  const usedIds = new Set();
  buttons.forEach((button) => {
    const id = normalizeText(button.getAttribute("data-llm-id"));
    if (!id) {
      throw new Error("按钮缺少 data-llm-id");
    }
    if (usedIds.has(id)) {
      throw new Error(`页面返回的按钮 ID 重复: ${id}`);
    }
    usedIds.add(id);
    const text = getButtonLabel(button);
    const replacement = `[button: "${text}", id: "${id}"]`;
    button.textContent = replacement;
    if (button.tagName === "INPUT") {
      button.value = replacement;
      button.setAttribute("value", replacement);
    }
  });
  const processedHtml = documentResult.body.innerHTML;
  const content = turndown.turndown(processedHtml);
  return { title: pageData.title || "", url: pageData.url || "", content };
};
export const setText = (node, text) => {
  node.textContent = text || "";
};
export const normalizeTheme = (theme) =>
  theme === "light" || theme === "dark" || theme === "auto" ? theme : "auto";
export const showKeyView = () => {
  keyView.classList.remove("hidden");
  chatView.classList.add("hidden");
  setText(keyStatus, "");
};
export const showChatView = () => {
  keyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  setText(statusEl, "");
  promptEl.focus();
};
export const applyTheme = (theme) => {
  const normalized = normalizeTheme(theme);
  if (normalized === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", normalized);
  }
  return normalized;
};
export const renderMessages = () => {
  messagesEl.innerHTML = "";
  state.messages.forEach((msg) => {
    if (msg.hidden) return;
    if (msg.role === "tool") return;
    if (msg.role === "assistant" && !msg.content) return;
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.innerHTML = renderMarkdown(msg.content);
    messagesEl.appendChild(node);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
};
export const appendAssistantDelta = (delta) => {
  if (!delta) return;
  const last = state.messages[state.messages.length - 1];
  if (!last || last.role !== "assistant") {
    state.messages.push({ role: "assistant", content: delta });
    renderMessages();
    return;
  }
  last.content += delta;
  const lastEl = messagesEl.lastElementChild;
  if (lastEl && lastEl.classList.contains("assistant")) {
    lastEl.innerHTML = renderMarkdown(last.content);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return;
  }
  renderMessages();
};
export const clearChat = () => {
  state.messages = [];
  renderMessages();
  setText(statusEl, "已清空对话");
};
