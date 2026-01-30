import { getSettings } from "../services/index.js";
import { initMarkdownRenderer } from "../markdown/index.js";
import {
  applyTheme,
  applyTypography,
  fillSettingsForm,
  followModeSwitch,
  setupChatLayout,
  showChatView,
  showKeyView,
} from "../ui/index.js";
import bindEvents from "./controller.js";
import { syncSettingsSnapshot } from "./settingsController.js";
import { refreshSendWithPageButton } from "./sendWithPageButton.js";
import { updateComposerButtonsState } from "./messageSender.js";
import { renderMessagesView } from "./messagePresenter.js";

const initPanel = async () => {
  const settingsPromise = getSettings();
  await initMarkdownRenderer();
  applyTypography();
  const settings = await settingsPromise;
  fillSettingsForm(settings);
  applyTheme(settings.theme);
  followModeSwitch.selected = Boolean(settings.followMode);
  syncSettingsSnapshot(settings);
  setupChatLayout();
  if (settings.apiKey && settings.baseUrl && settings.model) {
    showChatView();
  } else {
    showKeyView({ isFirstUse: true });
  }
  renderMessagesView();
  bindEvents();
  updateComposerButtonsState();
  await refreshSendWithPageButton();
};
export default initPanel;
