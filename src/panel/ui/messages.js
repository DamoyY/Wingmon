import { messagesEl } from "./elements.js";
import renderMarkdown from "../markdown/renderer.js";
import { state, addMessage, updateMessage } from "../state/store.js";

export const renderMessages = () => {
  messagesEl.innerHTML = "";
  state.messages.forEach((msg) => {
    if (msg.hidden) {
      return;
    }
    const node = document.createElement("div");
    node.className = `message ${msg.role}`;
    node.innerHTML = renderMarkdown(msg.content);
    messagesEl.appendChild(node);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
};
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
    lastEl.innerHTML = renderMarkdown(updated.content);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return;
  }
  renderMessages();
};
