import {
  getSettings,
  initTabListeners,
  registerSandboxWindowProvider,
} from "../../core/services/index.ts";
import { initMarkdownRenderer } from "../../lib/markdown/index.ts";
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
import { updateComposerButtonsState } from "../../features/chat/index.ts";
import {
  refreshSendWithPageButton,
  renderMessagesView,
} from "../../features/chat/messages/index.ts";
import { syncSettingsSnapshot } from "../../features/settings/index.ts";
import { setLocale, translateDOM } from "../../lib/utils/index.ts";
import { bindPanelEvents } from "../bindings/index.ts";

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
  elements.followModeSwitch.selected = settings.followMode;
  syncSettingsSnapshot(settings);
  setupChatLayout();
  if (settings.apiKey && settings.baseUrl && settings.model) {
    await showChatView();
  } else {
    await showKeyView({ isFirstUse: true });
  }
  renderMessagesView();
  bindPanelEvents();
  updateComposerButtonsState();
  await refreshSendWithPageButton();
};
export default initPanel;
