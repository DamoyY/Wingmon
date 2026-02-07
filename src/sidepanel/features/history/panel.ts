import {
  renderHistoryListView,
  showChatView,
  showConfirmDialog,
  showHistoryView,
} from "../../ui/index.ts";
import { state } from "../../core/store/index.ts";
import { t } from "../../lib/utils/index.ts";
import { fetchSortedHistory } from "./data.ts";
import type { HistoryActionHandler } from "./ui/listView.js";
import {
  deleteConversationById,
  loadConversationIntoState,
} from "./conversation.ts";

type RefreshHistoryListOptions = {
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
};

const refreshHistoryList = async ({
    onSelect,
    onDeleteRequest,
  }: RefreshHistoryListOptions = {}): Promise<void> => {
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
  handleSelectConversation = async (id: string): Promise<void> => {
    if (state.sending) {
      return;
    }
    if (id !== state.conversationId) {
      await loadConversationIntoState(id);
    }
    await showChatView({ animate: true });
  },
  handleDeleteRequest = async (id: string): Promise<void> => {
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

export const handleOpenHistory = async (): Promise<void> => {
  await refreshHistoryList({
    onSelect: handleSelectConversation,
    onDeleteRequest: handleDeleteRequest,
  });
  await showHistoryView({ animate: true });
};

export const handleCloseHistory = async (): Promise<void> => {
  await showChatView({ animate: true });
};
