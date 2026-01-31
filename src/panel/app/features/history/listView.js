import { elements } from "../../ui/index.js";

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const runHandler = async (handler, ...args) => {
  if (!handler) {
    return;
  }
  try {
    await handler(...args);
  } catch (error) {
    console.error(error);
  }
};

const createEmptyState = (message) => {
  const empty = document.createElement("div");
  empty.className = "history-empty md-typescale-body-small";
  empty.textContent = message;
  return empty;
};

const createHeadline = (timestamp) => {
  const headline = document.createElement("div");
  headline.slot = "headline";
  headline.className = "md-typescale-body-small";
  headline.textContent = formatDateTime(timestamp);
  return headline;
};

const createDeleteButton = ({ label, onDeleteRequest, id }) => {
  const deleteBtn = document.createElement("md-icon-button");
  deleteBtn.slot = "end";
  deleteBtn.className = "delete-icon";
  deleteBtn.title = label;
  const deleteIcon = document.createElement("md-icon");
  deleteIcon.textContent = "delete";
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    runHandler(onDeleteRequest, id);
  });
  return deleteBtn;
};

const createHistoryItem = ({
  item,
  activeId,
  onSelect,
  onDeleteRequest,
  deleteLabel,
}) => {
  const listItem = document.createElement("md-list-item");
  listItem.type = "button";
  if (item.id === activeId) {
    listItem.classList.add("active");
  }
  listItem.appendChild(createHeadline(item.updatedAt));
  listItem.appendChild(
    createDeleteButton({
      label: deleteLabel,
      onDeleteRequest,
      id: item.id,
    }),
  );
  listItem.dataset.id = item.id;
  listItem.addEventListener("click", () => runHandler(onSelect, item.id));
  return listItem;
};

const renderHistoryListView = ({
  history,
  activeId,
  onSelect,
  onDeleteRequest,
  emptyText,
  deleteLabel,
}) => {
  const { historyList } = elements;
  if (!historyList) {
    throw new Error("历史记录列表未找到");
  }
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.appendChild(createEmptyState(emptyText));
    return;
  }
  history.forEach((item) => {
    historyList.appendChild(
      createHistoryItem({
        item,
        activeId,
        onSelect,
        onDeleteRequest,
        deleteLabel,
      }),
    );
  });
};

export default renderHistoryListView;
