import {
  handleCloseHistory,
  handleOpenHistory,
} from "../../features/history/index.ts";
import { elements } from "../../ui/index.ts";

const bindHistoryEvents = (): void => {
  const { historyButton, closeHistoryButton } = elements;
  historyButton.addEventListener("click", () => {
    void handleOpenHistory();
  });
  closeHistoryButton.addEventListener("click", () => {
    void handleCloseHistory();
  });
};

export default bindHistoryEvents;
