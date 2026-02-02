import bindComposerEvents from "./composer.js";
import bindHistoryEvents from "./history.js";
import bindSettingsEvents from "./settings.js";
import bindTabEvents from "./tabs.js";

const bindPanelEvents = () => {
  bindComposerEvents();
  bindHistoryEvents();
  bindSettingsEvents();
  bindTabEvents();
};

export default bindPanelEvents;
