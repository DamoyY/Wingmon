import {
  keyView,
  chatView,
  keyStatus,
  settingsHint,
  cancelSettings,
  statusEl,
  promptEl,
} from "./elements.js";
import setText from "./text.js";

const setSettingsMode = (isFirstUse) => {
  settingsHint.classList.toggle("hidden", !isFirstUse);
  cancelSettings.classList.toggle("hidden", isFirstUse);
};

export const showKeyView = ({ isFirstUse = false } = {}) => {
  keyView.classList.remove("hidden");
  chatView.classList.add("hidden");
  setText(keyStatus, "");
  setSettingsMode(isFirstUse);
};
export const showChatView = () => {
  keyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  setText(statusEl, "");
  promptEl.focus();
};
