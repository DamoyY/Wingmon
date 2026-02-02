import { elements } from "../../ui/index.js";
import {
  handleCloseHistory,
  handleOpenHistory,
} from "../features/history/index.js";

const bindHistoryEvents = () => {
  const { historyButton, closeHistoryButton } = elements;
  historyButton.addEventListener("click", handleOpenHistory);
  closeHistoryButton.addEventListener("click", handleCloseHistory);
};

export default bindHistoryEvents;
