import { getSettings, initTabListeners } from "../../services/index.js";
import { initMarkdownRenderer } from "../../markdown/index.js";
import {
  applyTheme,
  applyTypography,
  elements,
  fillSettingsForm,
  initElements,
  setupChatLayout,
  showChatView,
  showKeyView,
} from "../../ui/index.js";
import bindEvents from "./controller.js";
import { syncSettingsSnapshot } from "../features/settings/controller.js";
import { refreshSendWithPageButton } from "../features/messages/sendWithPageButton.js";
import { updateComposerButtonsState } from "../features/chat/composerView.js";
import { renderMessagesView } from "../features/messages/presenter.js";
import { setLocale, translateDOM } from "../../utils/index.js";

const initPanel = async () => {
  initTabListeners();
  const settingsPromise = getSettings();

  await initElements();
  await initMarkdownRenderer();
  applyTypography();
  const settings = await settingsPromise;
  await setLocale(settings.language || "en");
  translateDOM();
  fillSettingsForm(settings);
  applyTheme(settings.theme, settings.themeColor);
  if (!elements.followModeSwitch) {
    throw new Error("跟随模式开关未初始化");
  }
  elements.followModeSwitch.selected = Boolean(settings.followMode);
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
