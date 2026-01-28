import { getSettings } from "../services/index.js";
import {
  applyTheme,
  fillSettingsForm,
  showChatView,
  showKeyView,
} from "../ui/index.js";
import bindEvents from "./controller.js";
import { syncSettingsSnapshot } from "./settingsController.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";
import { updateComposerButtonsState } from "./messageSender.js";

const initPanel = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  syncSettingsSnapshot(settings);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView({ isFirstUse: true });
  }
  bindEvents();
  updateComposerButtonsState();
  await refreshSendWithPageButton();
};
export default initPanel;
