import {
  elements,
  prefersReducedMotion,
} from "../../../../ui/foundation/index.ts";
import { resolveIndicesKey } from "../../../../lib/utils/index.ts";

const FADE_OUT_DURATION = 100;
const FADE_OUT_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const MESSAGE_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const MESSAGE_EDGE_GAP = 12;
const MESSAGE_ENTER_DURATION = 240;
const MESSAGE_EXIT_DURATION = 200;

let activeAnimation: Animation | null = null;
let fadePromise: Promise<void> | null = null;
const pendingRemovalIndicesKeys = new Set<string>();

const ensureMessagesElement = (): (typeof elements)["messagesEl"] =>
  elements.messagesEl;

const resolvePendingRemovalKey = (
  indices: number | readonly number[],
): string => resolveIndicesKey(indices);

const resolveMessageRowEdgeOffset = (
  row: HTMLElement,
  role: "user" | "assistant",
  container: HTMLElement,
): number => {
  const rowRect = row.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  if (role === "user") {
    const gap = Math.max(containerRect.right - rowRect.right, 0);
    return gap + MESSAGE_EDGE_GAP;
  }
  const gap = Math.max(rowRect.left - containerRect.left, 0);
  return -(gap + MESSAGE_EDGE_GAP);
};

export const animateMessageRowEnter = (row: HTMLElement): void => {
  if (prefersReducedMotion()) {
    return;
  }
  const container = ensureMessagesElement();
  const role = row.classList.contains("user") ? "user" : "assistant";
  const offsetX = resolveMessageRowEdgeOffset(row, role, container);
  row.animate(
    [
      {
        opacity: 0,
        transform: `translate3d(${String(offsetX)}px, 0, 0)`,
      },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ],
    {
      duration: MESSAGE_ENTER_DURATION,
      easing: MESSAGE_ANIMATION_EASING,
      fill: "both",
    },
  );
};

const animateMessageRowExit = async (row: HTMLElement): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }
  const container = ensureMessagesElement();
  const role = row.classList.contains("user") ? "user" : "assistant";
  const offsetX = resolveMessageRowEdgeOffset(row, role, container);
  const animation = row.animate(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
      {
        opacity: 0,
        transform: `translate3d(${String(offsetX)}px, 0, 0)`,
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

export const fadeOutMessages = async (): Promise<boolean> => {
  const container = ensureMessagesElement();
  const hasMessages = container.querySelector(".message-row") !== null;
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
  const animation = container.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FADE_OUT_DURATION,
    easing: FADE_OUT_EASING,
    fill: "both",
  });
  activeAnimation = animation;
  fadePromise = (async () => {
    try {
      await animation.finished;
    } finally {
      container.style.opacity = "0";
      animation.cancel();
      if (activeAnimation === animation) {
        activeAnimation = null;
      }
      fadePromise = null;
    }
  })();
  await fadePromise;
  return true;
};

export const resetMessagesFade = (): void => {
  const container = ensureMessagesElement();
  if (activeAnimation) {
    activeAnimation.cancel();
    activeAnimation = null;
    fadePromise = null;
  }
  container.style.opacity = "";
};

export const isMessageRemovalPending = (
  indices: number | readonly number[],
): boolean => pendingRemovalIndicesKeys.has(resolvePendingRemovalKey(indices));

export const restoreMessageRemoval = (
  indices: number | readonly number[],
): void => {
  const key = resolvePendingRemovalKey(indices);
  pendingRemovalIndicesKeys.delete(key);
  const container = ensureMessagesElement();
  const row = container.querySelector(`.message-row[data-indices="${key}"]`);
  if (!(row instanceof HTMLElement)) {
    return;
  }
  row.style.opacity = "";
  row.style.pointerEvents = "";
  row.style.transform = "";
};

export const pruneMessageRemovalPending = (
  activeIndicesKeys: readonly string[],
): void => {
  const activeSet = new Set(activeIndicesKeys);
  pendingRemovalIndicesKeys.forEach((key) => {
    if (!activeSet.has(key)) {
      pendingRemovalIndicesKeys.delete(key);
    }
  });
};

export const animateMessageRemoval = async (
  indices: number | readonly number[],
): Promise<boolean> => {
  const container = ensureMessagesElement();
  if (prefersReducedMotion()) {
    return false;
  }
  const key = resolvePendingRemovalKey(indices);
  const row = container.querySelector(`.message-row[data-indices="${key}"]`);
  if (!(row instanceof HTMLElement)) {
    return false;
  }
  pendingRemovalIndicesKeys.add(key);
  try {
    await animateMessageRowExit(row);
  } catch (error) {
    const resolvedError = error instanceof Error ? error : null;
    console.error("消息删除动画执行失败", resolvedError);
  }
  row.style.opacity = "0";
  row.style.pointerEvents = "none";
  return true;
};
