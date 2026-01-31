import { elements } from "../ui/index.js";
import { setSendWithPagePromptReady } from "./sendWithPageButton.js";

const BUTTON_VISIBILITY_DURATION = 180;
const BUTTON_VISIBILITY_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ensurePromptValue = (value) => {
  if (typeof value !== "string") {
    throw new Error("输入内容格式无效");
  }
  return value;
};

const ensurePromptElement = () => {
  const { promptEl } = elements;
  if (!promptEl) {
    throw new Error("输入框未找到");
  }
  return promptEl;
};

const hasPromptContent = () => {
  const promptEl = ensurePromptElement();
  return Boolean(ensurePromptValue(promptEl.value).trim());
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
    return;
  }
  target.getAnimations().forEach((animation) => animation.cancel());
  if (shouldShow && !isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return;
  }
  if (!shouldShow && isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return;
  }
  if (shouldShow) {
    target.classList.remove("hidden");
    target.style.pointerEvents = "";
  } else {
    target.style.pointerEvents = "none";
  }
  const animation = target.animate(
    [{ opacity: shouldShow ? 0 : 1 }, { opacity: shouldShow ? 1 : 0 }],
    {
      duration: BUTTON_VISIBILITY_DURATION,
      easing: BUTTON_VISIBILITY_EASING,
      fill: "both",
    },
  );
  const finalize = () => {
    if (target.dataset.visibilityTarget !== targetState) {
      return;
    }
    finalizeVisibility(target, shouldShow);
    delete target.dataset.visibilityTarget;
    animation.cancel();
  };
  animation.addEventListener("finish", finalize, { once: true });
  animation.addEventListener("cancel", finalize, { once: true });
};

export const getPromptContent = () => {
  const promptEl = ensurePromptElement();
  return ensurePromptValue(promptEl.value).trim();
};

export const clearPromptContent = () => {
  const promptEl = ensurePromptElement();
  promptEl.value = "";
};

export const updateComposerButtonsState = () => {
  const { sendButton } = elements;
  if (!sendButton) {
    throw new Error("发送按钮未找到");
  }
  const hasContent = hasPromptContent();
  sendButton.disabled = !hasContent;
  setSendWithPagePromptReady(hasContent);
};

export const setComposerSending = (sending) => {
  if (typeof sending !== "boolean") {
    throw new Error("发送状态必须为布尔值");
  }
  const { sendButton, sendWithPageButton, stopButton } = elements;
  if (!sendButton || !sendWithPageButton || !stopButton) {
    throw new Error("发送按钮未找到");
  }
  animateButtonVisibility(sendButton, !sending);
  animateButtonVisibility(sendWithPageButton, !sending);
  animateButtonVisibility(stopButton, sending);
};
