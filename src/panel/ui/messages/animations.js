import { elements } from "../core/elements.js";
import { resolveIndicesKey } from "./keys.js";

const FADE_OUT_DURATION = 100;
const FADE_OUT_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const MESSAGE_ENTER_DURATION = 240;
const MESSAGE_EXIT_DURATION = 200;
const MESSAGE_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const MESSAGE_EDGE_GAP = 12;
let fadePromise = null;
let activeAnimation = null;

const ensureMessagesElement = () => {
  if (!elements.messagesEl) {
    throw new Error("消息容器未找到");
  }
  return elements.messagesEl;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const resolveMessageRowEdgeOffset = (row, role, container) => {
  const rowRect = row.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  if (role === "user") {
    const gap = Math.max(containerRect.right - rowRect.right, 0);
    return gap + MESSAGE_EDGE_GAP;
  }
  const gap = Math.max(rowRect.left - containerRect.left, 0);
  return -(gap + MESSAGE_EDGE_GAP);
};

export const animateMessageRowEnter = (row) => {
  if (prefersReducedMotion()) {
    return;
  }
  const container = ensureMessagesElement();
  const role = row.classList.contains("user") ? "user" : "assistant";
  const offsetX = resolveMessageRowEdgeOffset(row, role, container);
  row.animate(
    [
      {
        transform: `translate3d(${offsetX}px, 0, 0)`,
        opacity: 0,
      },
      { transform: "translate3d(0, 0, 0)", opacity: 1 },
    ],
    {
      duration: MESSAGE_ENTER_DURATION,
      easing: MESSAGE_ANIMATION_EASING,
      fill: "both",
    },
  );
};

const animateMessageRowExit = async (row) => {
  if (prefersReducedMotion()) {
    return;
  }
  const container = ensureMessagesElement();
  const role = row.classList.contains("user") ? "user" : "assistant";
  const offsetX = resolveMessageRowEdgeOffset(row, role, container);
  const animation = row.animate(
    [
      { transform: "translate3d(0, 0, 0)", opacity: 1 },
      {
        transform: `translate3d(${offsetX}px, 0, 0)`,
        opacity: 0,
      },
    ],
    {
      duration: MESSAGE_EXIT_DURATION,
      easing: MESSAGE_ANIMATION_EASING,
      fill: "both",
    },
  );
  try {
    await animation.finished;
  } finally {
    animation.cancel();
  }
};

export const fadeOutMessages = async () => {
  const container = ensureMessagesElement();
  const hasMessages = Boolean(container.querySelector(".message-row"));
  if (!hasMessages) {
    return false;
  }
  if (prefersReducedMotion()) {
    return true;
  }
  if (fadePromise) {
    await fadePromise;
    return true;
  }
  activeAnimation = container.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FADE_OUT_DURATION,
    easing: FADE_OUT_EASING,
    fill: "both",
  });
  fadePromise = (async () => {
    try {
      await activeAnimation.finished;
    } finally {
      container.style.opacity = "0";
      activeAnimation.cancel();
      activeAnimation = null;
      fadePromise = null;
    }
  })();
  await fadePromise;
  return true;
};

export const resetMessagesFade = () => {
  const container = ensureMessagesElement();
  if (activeAnimation) {
    activeAnimation.cancel();
    activeAnimation = null;
    fadePromise = null;
  }
  container.style.opacity = "";
};

export const animateMessageRemoval = async (indices) => {
  const container = ensureMessagesElement();
  if (prefersReducedMotion()) {
    return false;
  }
  const key = resolveIndicesKey(indices);
  const row = container.querySelector(`.message-row[data-indices="${key}"]`);
  if (!row) {
    return false;
  }
  try {
    await animateMessageRowExit(row);
  } catch (error) {
    console.error("消息删除动画执行失败", error);
  }
  return true;
};
