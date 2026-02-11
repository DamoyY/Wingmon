import {
  deleteConversationById,
  loadConversationIntoState,
} from "./conversation.ts";
import {
  renderHistoryListView,
  showChatView,
  showConfirmDialog,
  showHistoryView,
} from "../../ui/index.ts";
import type { HistoryActionHandler } from "./listView.ts";
import { getHistory } from "../../core/services/index.ts";
import { state } from "../../core/store/index.ts";
import { t } from "../../lib/utils/index.ts";

type RefreshHistoryListOptions = {
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
};

const refreshHistoryList = async ({
    onSelect,
    onDeleteRequest,
  }: RefreshHistoryListOptions = {}): Promise<void> => {
    const history = [...(await getHistory())].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    renderHistoryListView({
      activeId: state.conversationId,
      deleteLabel: t("delete"),
      emptyText: t("historyEmpty"),
      history,
      onDeleteRequest,
      onSelect,
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
      onDeleteRequest: handleDeleteRequest,
      onSelect: handleSelectConversation,
    });
  };

export const handleOpenHistory = async (): Promise<void> => {
  await refreshHistoryList({
    onDeleteRequest: handleDeleteRequest,
    onSelect: handleSelectConversation,
  });
  await showHistoryView({ animate: true });
};

export const handleCloseHistory = async (): Promise<void> => {
  await showChatView({ animate: true });
};
