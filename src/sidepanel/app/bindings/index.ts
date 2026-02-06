import bindComposerEvents from "./composer.ts";
import bindHistoryEvents from "./history.ts";
import bindSettingsEvents from "./settings.ts";
import bindTabEvents from "./tabs.ts";

const bindPanelEvents = (): void => {
  bindComposerEvents();
  bindHistoryEvents();
  bindSettingsEvents();
  bindTabEvents();
};

export {
  bindComposerEvents,
  bindHistoryEvents,
  bindPanelEvents,
  bindSettingsEvents,
  bindTabEvents,
};
