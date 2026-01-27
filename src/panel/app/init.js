import { getSettings } from "../services/settings";
import { fillSettingsForm } from "../ui/forms";
import { applyTheme } from "../ui/theme";
import { showChatView, showKeyView } from "../ui/views";
import { bindEvents } from "./controller";
import { refreshSendWithPageButton } from "./sendWithPageButton";

export const initPanel = async () => {
  const settings = await getSettings();
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView();
  }
  bindEvents();
  await refreshSendWithPageButton();
};
