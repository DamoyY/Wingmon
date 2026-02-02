import { elements } from "../core/elements.js";
import setText from "../core/text.js";

const ANIMATION_DURATION = 320,
  ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

let isAnimating = false;

const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  resetViewStyles = (view) => {
    const target = view,
      { style } = target;
    style.transform = "";
    style.opacity = "";
    style.zIndex = "";
    style.pointerEvents = "";
  },
  setSettingsMode = (isFirstUse) => {
    const { settingsHint, cancelSettings } = elements;
    if (!settingsHint || !cancelSettings) {
      throw new Error("设置视图元素未初始化");
    }
    settingsHint.classList.toggle("hidden", !isFirstUse);
    cancelSettings.classList.toggle("hidden", isFirstUse);
  },
  resolveActiveView = () => {
    const { historyView, keyView } = elements;
    if (historyView && !historyView.classList.contains("hidden")) {
      return historyView;
    }
    if (keyView && !keyView.classList.contains("hidden")) {
      return keyView;
    }
    return keyView;
  },
  animateSwap = async ({
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
      const incomingView = incoming,
        outgoingView = outgoing;
      outgoingView.classList.add("hidden");
      incomingView.classList.remove("hidden");
      resetViewStyles(outgoingView);
      resetViewStyles(incomingView);
      onComplete?.();
      return;
    }
    isAnimating = true;
    const incomingView = incoming,
      outgoingView = outgoing;
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
      ),
      outgoingAnimation = outgoingView.animate(
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
      await Promise.all([
        incomingAnimation.finished,
        outgoingAnimation.finished,
      ]);
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
  const { keyView, chatView, historyView, keyStatus } = elements;
  if (!keyView || !chatView || !historyView || !keyStatus) {
    throw new Error("视图元素未初始化");
  }
  if (!animate) {
    keyView.classList.remove("hidden");
    chatView.classList.add("hidden");
    historyView.classList.add("hidden");
    resetViewStyles(chatView);
    resetViewStyles(historyView);
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
  const { keyView, historyView, chatView, promptEl } = elements;
  if (!keyView || !historyView || !chatView || !promptEl) {
    throw new Error("视图元素未初始化");
  }
  if (animate) {
    const outgoingView = resolveActiveView();
    return animateSwap({
      incoming: chatView,
      outgoing: outgoingView,
      incomingFrom: "-100%",
      outgoingTo: "100%",
      onComplete: () => {
        promptEl.focus();
      },
    });
  }
  keyView.classList.add("hidden");
  historyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  resetViewStyles(keyView);
  resetViewStyles(historyView);
  resetViewStyles(chatView);
  promptEl.focus();
  return Promise.resolve();
};

export const showHistoryView = ({ animate = false } = {}) => {
  const { keyView, historyView, chatView } = elements;
  if (!keyView || !historyView || !chatView) {
    throw new Error("视图元素未初始化");
  }
  if (!animate) {
    historyView.classList.remove("hidden");
    chatView.classList.add("hidden");
    keyView.classList.add("hidden");
    resetViewStyles(chatView);
    resetViewStyles(keyView);
    resetViewStyles(historyView);
    return Promise.resolve();
  }
  return animateSwap({
    incoming: historyView,
    outgoing: chatView,
    incomingFrom: "100%",
    outgoingTo: "-100%",
  });
};
