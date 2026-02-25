import {
  focusRippleHostId,
  focusRippleSpawnIntervalMs,
  focusRippleTopLayerCandidateSelector,
} from "./constants.js";
import {
  bringFocusRippleHostToFront,
  ensureFocusRippleHost,
  ensureFocusRippleStyle,
  removeFocusRippleHost,
  spawnFocusRippleWave,
} from "./overlayHost.js";
import { focusRippleRuntime } from "./runtime.js";

const isFocusRippleTopLayerCandidate = (element: Element): boolean => {
  return element.matches(focusRippleTopLayerCandidateSelector);
};

const hasTopLayerCandidateInTree = (element: Element): boolean => {
  return (
    isFocusRippleTopLayerCandidate(element) ||
    element.querySelector(focusRippleTopLayerCandidateSelector) !== null
  );
};

const shouldRestackFocusRippleForMutation = (
  mutation: MutationRecord,
): boolean => {
  if (mutation.type === "attributes") {
    const target = mutation.target;
    if (!(target instanceof Element)) {
      return false;
    }
    if (target.id === focusRippleHostId) {
      return false;
    }
    if (!isFocusRippleTopLayerCandidate(target)) {
      return false;
    }
    const attributeName = mutation.attributeName;
    return attributeName === "open" || attributeName === "popover";
  }
  if (mutation.type !== "childList") {
    return false;
  }
  for (const node of mutation.addedNodes) {
    if (!(node instanceof Element)) {
      continue;
    }
    if (node.id === focusRippleHostId) {
      continue;
    }
    if (hasTopLayerCandidateInTree(node)) {
      return true;
    }
  }
  return false;
};

const cancelFocusRippleRestackFrame = (): void => {
  if (focusRippleRuntime.restackFrameId === null) {
    return;
  }
  window.cancelAnimationFrame(focusRippleRuntime.restackFrameId);
  focusRippleRuntime.restackFrameId = null;
};

const scheduleFocusRippleRestack = (): void => {
  if (!focusRippleRuntime.enabled || document.hidden) {
    return;
  }
  if (focusRippleRuntime.restackFrameId !== null) {
    return;
  }
  focusRippleRuntime.restackFrameId = window.requestAnimationFrame(() => {
    focusRippleRuntime.restackFrameId = null;
    try {
      bringFocusRippleHostToFront();
    } catch (error) {
      console.error("焦点波纹顶部图层重排失败", error);
    }
  });
};

const startFocusRippleObserver = (): void => {
  if (focusRippleRuntime.observer !== null) {
    return;
  }
  const observer = new MutationObserver((mutations) => {
    if (!focusRippleRuntime.enabled || document.hidden) {
      return;
    }
    for (const mutation of mutations) {
      if (shouldRestackFocusRippleForMutation(mutation)) {
        scheduleFocusRippleRestack();
        return;
      }
    }
  });
  observer.observe(document.documentElement, {
    attributeFilter: ["open", "popover"],
    attributes: true,
    childList: true,
    subtree: true,
  });
  focusRippleRuntime.observer = observer;
};

const stopFocusRippleObserver = (): void => {
  const observer = focusRippleRuntime.observer;
  if (observer === null) {
    return;
  }
  observer.disconnect();
  focusRippleRuntime.observer = null;
};

const stopFocusRipple = (): void => {
  if (focusRippleRuntime.intervalId !== null) {
    window.clearInterval(focusRippleRuntime.intervalId);
    focusRippleRuntime.intervalId = null;
  }
  cancelFocusRippleRestackFrame();
  stopFocusRippleObserver();
  removeFocusRippleHost();
};

const startFocusRipple = (): void => {
  if (!focusRippleRuntime.enabled || document.hidden) {
    return;
  }
  if (focusRippleRuntime.intervalId !== null) {
    return;
  }
  ensureFocusRippleStyle();
  ensureFocusRippleHost();
  startFocusRippleObserver();
  try {
    bringFocusRippleHostToFront();
  } catch (error) {
    console.error("焦点波纹容器置顶失败", error);
  }
  spawnFocusRippleWave();
  focusRippleRuntime.intervalId = window.setInterval(() => {
    try {
      spawnFocusRippleWave();
    } catch (error) {
      console.error("焦点波纹渲染失败", error);
    }
  }, focusRippleSpawnIntervalMs);
};

const registerFocusRippleListeners = (): void => {
  if (focusRippleRuntime.listenersReady) {
    return;
  }
  focusRippleRuntime.listenersReady = true;
  document.addEventListener("fullscreenchange", () => {
    if (!focusRippleRuntime.enabled || document.hidden) {
      return;
    }
    scheduleFocusRippleRestack();
  });
  document.addEventListener("toggle", (event: Event) => {
    if (!focusRippleRuntime.enabled || document.hidden) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (!target.matches("[popover]")) {
      return;
    }
    scheduleFocusRippleRestack();
  });
  document.addEventListener("visibilitychange", () => {
    if (!focusRippleRuntime.enabled) {
      return;
    }
    if (document.hidden) {
      stopFocusRipple();
      return;
    }
    startFocusRipple();
  });
};

export const setFocusRippleEnabled = (enabled: boolean): void => {
  focusRippleRuntime.enabled = enabled;
  registerFocusRippleListeners();
  if (!enabled) {
    stopFocusRipple();
    return;
  }
  startFocusRipple();
};
