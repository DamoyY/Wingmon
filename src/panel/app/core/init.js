import {
  getSettings,
  initTabListeners,
  registerSandboxWindowProvider,
} from "../../services/index.ts";
import { initMarkdownRenderer } from "../../markdown/index.js";
import {
  applyTheme,
  applyTypography,
  elements,
  fillSettingsForm,
  getSandboxWindow,
  initElements,
  setupChatLayout,
  showChatView,
  showKeyView,
} from "../../ui/index.ts";
import { updateComposerButtonsState } from "../features/chat/index.js";
import {
  refreshSendWithPageButton,
  renderMessagesView,
} from "../features/messages/index.ts";
import { syncSettingsSnapshot } from "../features/settings/index.js";
import { setLocale, translateDOM } from "../../utils/index.ts";
import { bindPanelEvents } from "../bindings/index.js";

const initPanel = async () => {
  initTabListeners();
  const settingsPromise = getSettings();

  await initElements();
  registerSandboxWindowProvider(getSandboxWindow);
  await initMarkdownRenderer();
  applyTypography();
  const settings = await settingsPromise;
  await setLocale(settings.language || "en");
  translateDOM();
  fillSettingsForm(settings);
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);
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
  bindPanelEvents();
  updateComposerButtonsState();
  await refreshSendWithPageButton();
};
export default initPanel;
