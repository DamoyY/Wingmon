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

const ANIMATION_DURATION = 320;
const ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

let isAnimating = false;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const resetViewStyles = (view) => {
  const target = view;
  const { style } = target;
  style.transform = "";
  style.opacity = "";
  style.zIndex = "";
  style.pointerEvents = "";
};

const setSettingsMode = (isFirstUse) => {
  settingsHint.classList.toggle("hidden", !isFirstUse);
  cancelSettings.classList.toggle("hidden", isFirstUse);
};

const animateSwap = async ({
  incoming,
  outgoing,
  incomingFrom,
  outgoingTo,
  onComplete,
}) => {
  if (isAnimating) {
    return;
  }
  if (prefersReducedMotion()) {
    const incomingView = incoming;
    const outgoingView = outgoing;
    outgoingView.classList.add("hidden");
    incomingView.classList.remove("hidden");
    resetViewStyles(outgoingView);
    resetViewStyles(incomingView);
    onComplete?.();
    return;
  }
  isAnimating = true;
  const incomingView = incoming;
  const outgoingView = outgoing;
  incomingView.classList.remove("hidden");
  outgoingView.classList.remove("hidden");
  resetViewStyles(incomingView);
  resetViewStyles(outgoingView);
  incomingView.style.zIndex = "2";
  outgoingView.style.zIndex = "1";
  incomingView.style.pointerEvents = "none";
  outgoingView.style.pointerEvents = "none";
  const incomingAnimation = incomingView.animate(
    [
      { transform: `translateX(${incomingFrom})`, opacity: 0 },
      { transform: "translateX(0)", opacity: 1 },
    ],
    {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      fill: "both",
    },
  );
  const outgoingAnimation = outgoingView.animate(
    [
      { transform: "translateX(0)", opacity: 1 },
      { transform: `translateX(${outgoingTo})`, opacity: 0 },
    ],
    {
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
      fill: "both",
    },
  );
  try {
    await Promise.all([incomingAnimation.finished, outgoingAnimation.finished]);
  } finally {
    outgoingView.classList.add("hidden");
    resetViewStyles(outgoingView);
    resetViewStyles(incomingView);
    incomingAnimation.cancel();
    outgoingAnimation.cancel();
    isAnimating = false;
    onComplete?.();
  }
};

export const showKeyView = ({ isFirstUse = false, animate = false } = {}) => {
  if (!animate) {
    keyView.classList.remove("hidden");
    chatView.classList.add("hidden");
    resetViewStyles(chatView);
    resetViewStyles(keyView);
  }
  setText(keyStatus, "");
  setSettingsMode(isFirstUse);
  if (animate) {
    return animateSwap({
      incoming: keyView,
      outgoing: chatView,
      incomingFrom: "100%",
      outgoingTo: "-100%",
    });
  }
  return Promise.resolve();
};

export const showChatView = ({ animate = false } = {}) => {
  setText(statusEl, "");
  if (animate) {
    return animateSwap({
      incoming: chatView,
      outgoing: keyView,
      incomingFrom: "-100%",
      outgoingTo: "100%",
      onComplete: () => {
        promptEl.focus();
      },
    });
  }
  keyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  resetViewStyles(keyView);
  resetViewStyles(chatView);
  promptEl.focus();
  return Promise.resolve();
};
