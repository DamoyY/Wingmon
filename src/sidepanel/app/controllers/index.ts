import bindComposerEvents from "./composer.ts";
import bindHistoryEvents from "./historyController.ts";
import bindSettingsEvents from "./settings.ts";
import bindTabEvents from "./tabEventsController.ts";

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
