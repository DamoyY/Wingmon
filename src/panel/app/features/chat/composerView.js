import { elements } from "../../../ui/index.js";
import { setSendWithPagePromptReady } from "../messages/sendWithPageButton.js";
import { hasPromptContent } from "./composerState.js";

const BUTTON_VISIBILITY_DURATION = 180;
const BUTTON_VISIBILITY_EASING = "cubic-bezier(0.2, 0, 0, 1)";
let visibilitySwapToken = 0;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ensureSendButton = () => {
  const { sendButton } = elements;
  if (!sendButton) {
    throw new Error("发送按钮未找到");
  }
  return sendButton;
};

const ensureComposerButtons = () => {
  const { sendButton, sendWithPageButton, stopButton } = elements;
  if (!sendButton || !sendWithPageButton || !stopButton) {
    throw new Error("发送按钮未找到");
  }
  return { sendButton, sendWithPageButton, stopButton };
};

const finalizeVisibility = (element, shouldShow) => {
  const target = element;
  target.style.opacity = "";
  target.style.pointerEvents = "";
  if (!shouldShow) {
    target.classList.add("hidden");
  }
};

const animateButtonVisibility = (button, shouldShow) => {
  const target = button;
  const targetState = shouldShow ? "show" : "hide";
  const isHidden = target.classList.contains("hidden");
  target.dataset.visibilityTarget = targetState;
  if (prefersReducedMotion()) {
    target.classList.toggle("hidden", !shouldShow);
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return Promise.resolve();
  }
  target.getAnimations().forEach((animation) => animation.cancel());
  if (shouldShow && !isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return Promise.resolve();
  }
  if (!shouldShow && isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return Promise.resolve();
  }
  if (shouldShow) {
    target.classList.remove("hidden");
    target.style.pointerEvents = "";
  } else {
    target.style.pointerEvents = "none";
  }
  return new Promise((resolve) => {
    const animation = target.animate(
      [{ opacity: shouldShow ? 0 : 1 }, { opacity: shouldShow ? 1 : 0 }],
      {
        duration: BUTTON_VISIBILITY_DURATION,
        easing: BUTTON_VISIBILITY_EASING,
        fill: "both",
      },
    );
    let finalized = false;
    const finalize = () => {
      if (finalized) {
        return;
      }
      finalized = true;
      if (target.dataset.visibilityTarget === targetState) {
        finalizeVisibility(target, shouldShow);
        delete target.dataset.visibilityTarget;
      }
      animation.cancel();
      resolve();
    };
    animation.addEventListener("finish", finalize, { once: true });
    animation.addEventListener("cancel", finalize, { once: true });
  });
};

const swapComposerButtons = async (
  token,
  sending,
  sendButton,
  sendWithPageButton,
  stopButton,
) => {
  if (sending) {
    await Promise.all([
      animateButtonVisibility(sendButton, false),
      animateButtonVisibility(sendWithPageButton, false),
    ]);
    if (token !== visibilitySwapToken) {
      return;
    }
    await animateButtonVisibility(stopButton, true);
    return;
  }
  await animateButtonVisibility(stopButton, false);
  if (token !== visibilitySwapToken) {
    return;
  }
  await Promise.all([
    animateButtonVisibility(sendButton, true),
    animateButtonVisibility(sendWithPageButton, true),
  ]);
};

export const updateComposerButtonsState = () => {
  const sendButton = ensureSendButton();
  const hasContent = hasPromptContent();
  sendButton.disabled = !hasContent;
  setSendWithPagePromptReady(hasContent);
};

export const setComposerSending = (sending) => {
  if (typeof sending !== "boolean") {
    throw new Error("发送状态必须为布尔值");
  }
  const { sendButton, sendWithPageButton, stopButton } =
    ensureComposerButtons();
  visibilitySwapToken += 1;
  const token = visibilitySwapToken;
  swapComposerButtons(
    token,
    sending,
    sendButton,
    sendWithPageButton,
    stopButton,
  ).catch((error) => {
    console.error(error);
  });
};
