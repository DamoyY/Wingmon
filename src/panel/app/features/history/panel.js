import {
  showConfirmDialog,
  showHistoryView,
  showChatView,
} from "../../ui/index.js";
import { state } from "../../state/index.js";
import { t } from "../../utils/index.js";
import fetchSortedHistory from "./data.js";
import renderHistoryListView from "./listView.js";
import {
  deleteConversationById,
  loadConversationIntoState,
} from "./conversation.js";

const refreshHistoryList = async ({ onSelect, onDeleteRequest } = {}) => {
  const history = await fetchSortedHistory();
  renderHistoryListView({
    history,
    activeId: state.conversationId,
    onSelect,
    onDeleteRequest,
    emptyText: t("historyEmpty"),
    deleteLabel: t("delete"),
  });
};

const handleSelectConversation = async (id) => {
  if (state.sending) {
    return;
  }
  if (id !== state.conversationId) {
    await loadConversationIntoState(id);
  }
  await showChatView({ animate: true });
};

const handleDeleteRequest = async (id) => {
  const confirmed = await showConfirmDialog(t("historyDeleteConfirm"));
  if (!confirmed) {
    return;
  }
  await deleteConversationById(id);
  await refreshHistoryList({
    onSelect: handleSelectConversation,
    onDeleteRequest: handleDeleteRequest,
  });
};

export const handleOpenHistory = async () => {
  await refreshHistoryList({
    onSelect: handleSelectConversation,
    onDeleteRequest: handleDeleteRequest,
  });
  await showHistoryView({ animate: true });
};

export const handleCloseHistory = async () => {
  await showChatView({ animate: true });
};
