import { getSettings } from "../services/index.js";
import {
  applyTheme,
  fillSettingsForm,
  showChatView,
  showKeyView,
} from "../ui/index.js";
import bindEvents from "./controller.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";

const initPanel = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView({ isFirstUse: true });
  }
  bindEvents();
  await refreshSendWithPageButton();
};
export default initPanel;
