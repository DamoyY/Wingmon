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
export const turndown = new TurndownService({ codeBlockStyle: "fenced" });
turndown.remove(["script", "style"]);
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
    node.innerHTML = markdown.render(msg.content || "");
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
    lastEl.innerHTML = markdown.render(last.content || "");
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
