import {
  applyTheme,
  applyTypography,
  elements,
  fillSettingsForm,
  getStoredPanelPrimaryView,
  initElements,
  setupChatLayout,
  showChatView,
  showKeyView,
} from "../../ui/index.ts";
import {
  bindSendStateToStore,
  refreshSendWithPageButton,
  renderMessagesView,
} from "../../features/chat/messages/index.ts";
import {
  ensureSettingsReady,
  syncSettingsSnapshot,
} from "../../features/settings/index.ts";
import { setLocale, translateDOM } from "../../lib/utils/index.ts";
import { bindPanelEvents } from "../controllers/index.ts";
import { getSettings } from "../../../shared/index.ts";
import { handleOpenHistory } from "../../features/history/index.ts";
import { initMarkdownRenderer } from "../../lib/markdown/index.ts";
import { initPanelServerClient } from "../../core/server/index.ts";
import { updateComposerButtonsState } from "../../features/chat/index.ts";

const initPanel = async (): Promise<void> => {
  const settingsPromise = getSettings();
  const markdownPromise = initMarkdownRenderer();
  const storedPrimaryViewPromise = getStoredPanelPrimaryView();

  const settings = await settingsPromise;
  applyTheme(settings.theme, settings.themeColor, settings.themeVariant);

  await initElements();
  elements.keyView.classList.add("hidden");
  elements.historyView.classList.add("hidden");
  elements.chatView.classList.add("hidden");
  elements.followModeSwitch.selected = settings.followMode;

  applyTypography();
  await setLocale(settings.language || "en");
  const stateSyncPromise = initPanelServerClient();
  translateDOM();
  fillSettingsForm(settings);
  syncSettingsSnapshot(settings);
  setupChatLayout();
  const hasCompleteSettings = ensureSettingsReady(settings);
  const storedPrimaryView = await storedPrimaryViewPromise;
  if (!hasCompleteSettings) {
    await showKeyView({ isFirstUse: true });
  } else if (storedPrimaryView === "key") {
    await showKeyView({ isFirstUse: false });
  } else if (storedPrimaryView === "history") {
    await handleOpenHistory({ animate: false });
  } else {
    await showChatView();
  }
  await stateSyncPromise;
  await markdownPromise;
  bindSendStateToStore();
  renderMessagesView();
  bindPanelEvents();
  updateComposerButtonsState();
  await refreshSendWithPageButton();
};

export default initPanel;
