import {
  renderHistoryListView,
  showChatView,
  showConfirmDialog,
  showHistoryView,
} from "../../../ui/index.ts";
import { state } from "../../../state/index.ts";
import { t } from "../../../utils/index.ts";
import fetchSortedHistory from "./data.js";
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
  },
  handleSelectConversation = async (id) => {
    if (state.sending) {
      return;
    }
    if (id !== state.conversationId) {
      await loadConversationIntoState(id);
    }
    await showChatView({ animate: true });
  },
  handleDeleteRequest = async (id) => {
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
