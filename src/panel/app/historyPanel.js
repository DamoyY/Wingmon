import { historyPanel, historyList, setText, statusEl } from "../ui/index.js";
import {
  loadConversationState,
  resetConversation,
  state,
} from "../state/index.js";
import { renderMessagesView } from "./messagePresenter.js";
import {
  deleteConversation,
  getHistory,
  loadConversation,
} from "../services/index.js";

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const requestDeleteConfirmation = () =>
  new Promise((resolve) => {
    if (!document?.body) {
      throw new Error("页面未就绪，无法展示确认框");
    }
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    const message = document.createElement("div");
    message.className = "confirm-message";
    message.textContent = "确定要删除这条记录吗？";
    const actions = document.createElement("div");
    actions.className = "confirm-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "confirm-cancel";
    cancelButton.textContent = "取消";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "confirm-confirm";
    confirmButton.textContent = "删除";
    actions.append(cancelButton, confirmButton);
    dialog.append(message, actions);
    overlay.appendChild(dialog);
    let cleanup = () => {};
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(false);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        cleanup(true);
      }
    };
    cleanup = (result) => {
      window.removeEventListener("keydown", handleKeydown);
      overlay.remove();
      resolve(result);
    };
    cancelButton.addEventListener("click", () => cleanup(false));
    confirmButton.addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup(false);
      }
    });
    window.addEventListener("keydown", handleKeydown);
    document.body.appendChild(overlay);
    confirmButton.focus();
  });

const handleLoadConversation = async (id) => {
  if (state.sending) {
    return;
  }
  if (id === state.conversationId) {
    historyPanel.classList.add("hidden");
    return;
  }
  const conversation = await loadConversation(id);
  loadConversationState(
    conversation.id,
    conversation.messages,
    conversation.updatedAt,
  );
  renderMessagesView();
  historyPanel.classList.add("hidden");
  setText(statusEl, "");
};

export const renderHistoryList = async () => {
  const history = await getHistory();
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    return;
  }
  const sorted = [...history].sort((a, b) => b.updatedAt - a.updatedAt);
  sorted.forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-item";
    if (item.id === state.conversationId) {
      el.classList.add("active");
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = formatDateTime(item.updatedAt);
    el.appendChild(textSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "删除";
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const confirmed = await requestDeleteConfirmation();
      if (!confirmed) {
        return;
      }
      await deleteConversation(item.id);
      if (item.id === state.conversationId) {
        resetConversation();
        renderMessagesView();
        setText(statusEl, "");
      }
      await renderHistoryList();
    });
    el.appendChild(deleteBtn);

    el.dataset.id = item.id;
    el.addEventListener("click", () => handleLoadConversation(item.id));
    historyList.appendChild(el);
  });
};

export const toggleHistoryPanel = async () => {
  const isHidden = historyPanel.classList.contains("hidden");
  if (isHidden) {
    await renderHistoryList();
  }
  historyPanel.classList.toggle("hidden");
};

export const handleNewChat = async () => {
  if (state.sending) {
    return;
  }
  resetConversation();
  renderMessagesView();
  historyPanel.classList.add("hidden");
  setText(statusEl, "");
};
