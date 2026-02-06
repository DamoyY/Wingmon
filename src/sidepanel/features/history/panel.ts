import {
  renderHistoryListView,
  showChatView,
  showConfirmDialog,
  showHistoryView,
} from "../../ui/index.ts";
import { state } from "../../core/store/index.ts";
import { t } from "../../lib/utils/index.ts";
import { fetchSortedHistory } from "./data.ts";
import {
  deleteConversationById,
  loadConversationIntoState,
} from "./conversation.ts";

type HistoryActionHandler = (id: string) => Promise<void> | void;
type RefreshHistoryListOptions = {
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
};
type RenderHistoryListPayload = {
  history: Array<{ id: string; updatedAt: number }>;
  activeId: string;
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
  emptyText: string;
  deleteLabel: string;
};
type ViewTransition = (options: { animate: boolean }) => Promise<void> | void;

const renderHistoryListViewSafe = renderHistoryListView as (
    payload: RenderHistoryListPayload,
  ) => void,
  showChatViewSafe = showChatView as ViewTransition,
  showHistoryViewSafe = showHistoryView as ViewTransition,
  showConfirmDialogSafe = showConfirmDialog as (
    message: string,
  ) => Promise<boolean>;

const refreshHistoryList = async ({
    onSelect,
    onDeleteRequest,
  }: RefreshHistoryListOptions = {}): Promise<void> => {
    const history = await fetchSortedHistory();
    renderHistoryListViewSafe({
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
    await showChatViewSafe({ animate: true });
  },
  handleDeleteRequest = async (id: string): Promise<void> => {
    const confirmed = await showConfirmDialogSafe(t("historyDeleteConfirm"));
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
  await showHistoryViewSafe({ animate: true });
};

export const handleCloseHistory = async (): Promise<void> => {
  await showChatViewSafe({ animate: true });
};
