import bindComposerEvents from "./composer.js";
import bindHistoryEvents from "./history.js";
import bindSettingsEvents from "./settings.ts";
import bindTabEvents from "./tabs.js";

const bindPanelEvents = () => {
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
