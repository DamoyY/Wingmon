import { elements } from "../../ui/foundation/elements.ts";

export type HistoryActionHandler = (id: string) => Promise<void> | void;

export type HistoryItem = {
  id: string;
  updatedAt: number;
};

export type RenderHistoryListPayload = {
  history: HistoryItem[];
  activeId: string;
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
  emptyText: string;
  deleteLabel: string;
};

type DeleteButtonPayload = {
  label: string;
  onDeleteRequest?: HistoryActionHandler;
  id: string;
};

type HistoryItemViewPayload = {
  item: HistoryItem;
  activeId: string;
  onSelect?: HistoryActionHandler;
  onDeleteRequest?: HistoryActionHandler;
  deleteLabel: string;
};

const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp),
      pad = (value: number): string => String(value).padStart(2, "0");
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },
  runHandler = async (
    handler: HistoryActionHandler | undefined,
    id: string,
  ): Promise<void> => {
    if (!handler) {
      return;
    }
    try {
      await handler(id);
    } catch (error: unknown) {
      console.error(error);
    }
  },
  createEmptyState = (message: string): HTMLDivElement => {
    const empty = document.createElement("div");
    empty.className = "history-empty md-typescale-body-small";
    empty.textContent = message;
    return empty;
  },
  createHeadline = (timestamp: number): HTMLDivElement => {
    const headline = document.createElement("div");
    headline.slot = "headline";
    headline.className = "md-typescale-body-small";
    headline.textContent = formatDateTime(timestamp);
    return headline;
  },
  createDeleteButton = ({
    label,
    onDeleteRequest,
    id,
  }: DeleteButtonPayload): HTMLElement => {
    const deleteButton = document.createElement("md-icon-button");
    deleteButton.slot = "end";
    deleteButton.className = "delete-icon";
    deleteButton.title = label;
    const deleteIcon = document.createElement("md-icon");
    deleteIcon.textContent = "delete";
    deleteButton.appendChild(deleteIcon);
    deleteButton.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
      void runHandler(onDeleteRequest, id);
    });
    return deleteButton;
  },
  createHistoryItem = ({
    item,
    activeId,
    onSelect,
    onDeleteRequest,
    deleteLabel,
  }: HistoryItemViewPayload): HTMLElement => {
    const listItem = document.createElement("md-list-item");
    listItem.type = "button";
    if (item.id === activeId) {
      listItem.classList.add("active");
    }
    listItem.appendChild(createHeadline(item.updatedAt));
    listItem.appendChild(
      createDeleteButton({
        id: item.id,
        label: deleteLabel,
        onDeleteRequest,
      }),
    );
    listItem.dataset.id = item.id;
    listItem.addEventListener("click", () => {
      void runHandler(onSelect, item.id);
    });
    return listItem;
  },
  renderHistoryListView = ({
    history,
    activeId,
    onSelect,
    onDeleteRequest,
    emptyText,
    deleteLabel,
  }: RenderHistoryListPayload): void => {
    const { historyList } = elements;
    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.appendChild(createEmptyState(emptyText));
      return;
    }
    for (const item of history) {
      historyList.appendChild(
        createHistoryItem({
          activeId,
          deleteLabel,
          item,
          onDeleteRequest,
          onSelect,
        }),
      );
    }
  };

export default renderHistoryListView;
