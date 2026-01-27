import {
  keyView,
  chatView,
  keyStatus,
  statusEl,
  promptEl,
} from "./elements.js";
import setText from "./text.js";

export const showKeyView = () => {
  keyView.classList.remove("hidden");
  chatView.classList.add("hidden");
  setText(keyStatus, "");
};
export const showChatView = () => {
  keyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  setText(statusEl, "");
  promptEl.focus();
};
