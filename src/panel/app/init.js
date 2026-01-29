import { getSettings } from "../services/index.js";
import { initMarkdownRenderer } from "../markdown/index.js";
import {
  applyTheme,
  applyTypography,
  fillSettingsForm,
  setupChatLayout,
  showChatView,
  showKeyView,
} from "../ui/index.js";
import bindEvents from "./controller.js";
import { syncSettingsSnapshot } from "./settingsController.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";
import { updateComposerButtonsState } from "./messageSender.js";

const initPanel = async () => {
  const settingsPromise = getSettings();
  await initMarkdownRenderer();
  applyTypography();
  const settings = await settingsPromise;
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  syncSettingsSnapshot(settings);
  setupChatLayout();
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
