import {
  handleCloseHistory,
  handleOpenHistory,
} from "../features/history/index.ts";
import { elements } from "../../ui/index.ts";

const bindHistoryEvents = () => {
  const { historyButton, closeHistoryButton } = elements;
  historyButton.addEventListener("click", handleOpenHistory);
  closeHistoryButton.addEventListener("click", handleCloseHistory);
};

export default bindHistoryEvents;
