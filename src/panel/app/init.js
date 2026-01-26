import { getSettings } from "../services/settings.js";
import { fillSettingsForm } from "../ui/forms.js";
import { applyTheme } from "../ui/theme.js";
import { showChatView, showKeyView } from "../ui/views.js";
import { bindEvents } from "./controller.js";
import { refreshShareToggle } from "./shareToggle.js";
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
  await refreshShareToggle(settings);
};
