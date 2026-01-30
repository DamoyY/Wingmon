import {
  historyList,
  showConfirmDialog,
  fadeOutMessages,
  resetMessagesFade,
  showHistoryView,
  showChatView,
} from "../ui/index.js";
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

const handleLoadConversation = async (id) => {
  if (state.sending) {
    return;
  }
  if (id === state.conversationId) {
    await showChatView({ animate: true });
    return;
  }
  const conversation = await loadConversation(id);
  loadConversationState(
    conversation.id,
    conversation.messages,
    conversation.updatedAt,
  );
  renderMessagesView();
  await showChatView({ animate: true });
};

export const renderHistoryList = async () => {
  const history = await getHistory();
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML =
      '<div class="history-empty md-typescale-body-small">暂无历史记录</div>';
    return;
  }
  const sorted = [...history].sort((a, b) => b.updatedAt - a.updatedAt);
  sorted.forEach((item) => {
    const listItem = document.createElement("md-list-item");
    listItem.type = "button";
    if (item.id === state.conversationId) {
      listItem.classList.add("active");
    }

    const headline = document.createElement("div");
    headline.slot = "headline";
    headline.className = "md-typescale-body-small";
    headline.textContent = formatDateTime(item.updatedAt);
    listItem.appendChild(headline);

    const deleteBtn = document.createElement("md-icon-button");
    deleteBtn.slot = "end";
    deleteBtn.className = "delete-icon";
    deleteBtn.title = "删除";
    const deleteIcon = document.createElement("md-icon");
    deleteIcon.textContent = "delete";
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const confirmed = await showConfirmDialog("确定要删除这条记录吗？");
      if (!confirmed) {
        return;
      }
      await deleteConversation(item.id);
      if (item.id === state.conversationId) {
        resetConversation();
        renderMessagesView();
      }
      await renderHistoryList();
    });
    listItem.appendChild(deleteBtn);

    listItem.dataset.id = item.id;
    listItem.addEventListener("click", () => handleLoadConversation(item.id));
    historyList.appendChild(listItem);
  });
};

export const handleOpenHistory = async () => {
  await renderHistoryList();
  await showHistoryView({ animate: true });
};

export const handleCloseHistory = async () => {
  await showChatView({ animate: true });
};

export const handleNewChat = async () => {
  if (state.sending) {
    return;
  }
  await fadeOutMessages();
  resetConversation();
  renderMessagesView();
  resetMessagesFade();
};
