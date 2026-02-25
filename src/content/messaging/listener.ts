import {
  type ContentScriptRequestByType,
  type ContentScriptRequestType,
  type ContentScriptResponseByRequest,
  type ContentScriptResponseByType,
  type ContentScriptRpcHandlerMap,
  extractErrorMessage,
  isContentScriptRequest,
} from "../../shared/index.ts";
import {
  handleClickButton,
  handleEnterText,
  handleGetAllPageContent,
  handleGetPageContent,
  handleSetPageHash,
} from "../handlers/index.js";

const focusRippleHostId = "wingmon-focus-ripple-host";
const focusRippleStyleId = "wingmon-focus-ripple-style";
const focusRippleWaveClassName = "wingmon-focus-ripple-wave";
const focusRippleDurationMs = 2200;
const focusRippleConcurrentWaveCount = 2;
const focusRippleMotionEasing = "cubic-bezier(0.2, 0, 0, 1)";
const focusRipplePopoverMode = "manual";
const focusRippleTopLayerCandidateSelector = "dialog, [popover]";
const focusRippleSpawnIntervalMs = Math.round(
  focusRippleDurationMs / focusRippleConcurrentWaveCount,
);
const focusRippleLineInitialScale = 0.02;
const focusRippleLineTargetScale = 1.38;
const focusRippleLineTravelDistanceMultiplier = 1.05;
const focusRippleStyles = `
#${focusRippleHostId} {
  all: initial;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  border: 0;
  padding: 0;
  display: block;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
  z-index: 2147483647;
  contain: layout style paint;
}

#${focusRippleHostId}:not(:popover-open) {
  display: none;
}

#${focusRippleHostId}:popover-open {
  display: block;
}

#${focusRippleHostId}::backdrop {
  background: transparent;
}

#${focusRippleHostId}::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to left,
    rgba(103, 80, 164, 0.09),
    rgba(103, 80, 164, 0) 68%
  );
  opacity: 0.62;
}

.${focusRippleWaveClassName} {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to left,
    rgba(103, 80, 164, 0.28) 0%,
    rgba(103, 80, 164, 0.2) 8%,
    rgba(103, 80, 164, 0.12) 20%,
    rgba(103, 80, 164, 0.07) 34%,
    rgba(103, 80, 164, 0) 68%
  );
  opacity: 0;
  pointer-events: none;
  transform: translateX(0)
    scaleX(var(--wingmon-focus-ripple-line-scale-start, 0.02));
  transform-origin: right center;
  animation: wingmon-focus-ripple-wave ${String(focusRippleDurationMs)}ms
    ${focusRippleMotionEasing} forwards;
  will-change: transform, opacity;
}

@keyframes wingmon-focus-ripple-wave {
  0% {
    opacity: 0;
    transform: translateX(0)
      scaleX(var(--wingmon-focus-ripple-line-scale-start, 0.02));
  }

  14% {
    opacity: 0.22;
  }

  100% {
    opacity: 0;
    transform: translateX(calc(var(--wingmon-focus-ripple-travel-x, 640px) * -1))
      scaleX(var(--wingmon-focus-ripple-line-scale-end, 1.38));
  }
}

@media (forced-colors: active), (prefers-reduced-motion: reduce) {
  #${focusRippleHostId} {
    display: none !important;
  }
}
`;

type FocusRippleRuntime = {
  enabled: boolean;
  host: HTMLDivElement | null;
  intervalId: number | null;
  observer: MutationObserver | null;
  restackFrameId: number | null;
  listenersReady: boolean;
};

const focusRippleRuntime: FocusRippleRuntime = {
  enabled: false,
  host: null,
  intervalId: null,
  observer: null,
  restackFrameId: null,
  listenersReady: false,
};

const getFocusRippleMountRoot = (): HTMLBodyElement => {
  const root = document.body;
  if (root instanceof HTMLBodyElement) {
    return root;
  }
  throw new Error("焦点波纹容器挂载节点不可用");
};

const configureFocusRippleHost = (host: HTMLDivElement): void => {
  host.id = focusRippleHostId;
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("popover", focusRipplePopoverMode);
  host.popover = focusRipplePopoverMode;
};

const supportsFocusRipplePopover = (host: HTMLDivElement): boolean => {
  return (
    typeof host.showPopover === "function" &&
    typeof host.hidePopover === "function"
  );
};

const isFocusRippleHostOpen = (host: HTMLDivElement): boolean => {
  return host.matches(":popover-open");
};

const ensureFocusRippleStyle = (): HTMLStyleElement => {
  const existing = document.getElementById(focusRippleStyleId);
  if (existing) {
    if (existing instanceof HTMLStyleElement) {
      if (existing.textContent !== focusRippleStyles) {
        existing.textContent = focusRippleStyles;
      }
      return existing;
    }
    throw new Error("焦点波纹样式节点类型无效");
  }
  const style = document.createElement("style");
  style.id = focusRippleStyleId;
  style.textContent = focusRippleStyles;
  document.head.appendChild(style);
  return style;
};

const ensureFocusRippleHost = (): HTMLDivElement => {
  const existing = document.getElementById(focusRippleHostId);
  if (existing) {
    if (existing instanceof HTMLDivElement) {
      configureFocusRippleHost(existing);
      if (!existing.isConnected) {
        const mountRoot = getFocusRippleMountRoot();
        mountRoot.appendChild(existing);
      }
      focusRippleRuntime.host = existing;
      return existing;
    }
    throw new Error("焦点波纹容器节点类型无效");
  }
  const host = document.createElement("div");
  configureFocusRippleHost(host);
  const mountRoot = getFocusRippleMountRoot();
  mountRoot.appendChild(host);
  focusRippleRuntime.host = host;
  return host;
};

const openFocusRippleHost = (host: HTMLDivElement): void => {
  if (!supportsFocusRipplePopover(host)) {
    return;
  }
  if (!host.isConnected) {
    const mountRoot = getFocusRippleMountRoot();
    mountRoot.appendChild(host);
  }
  if (isFocusRippleHostOpen(host)) {
    return;
  }
  host.showPopover();
};

const closeFocusRippleHost = (host: HTMLDivElement): void => {
  if (!supportsFocusRipplePopover(host)) {
    return;
  }
  if (!isFocusRippleHostOpen(host)) {
    return;
  }
  host.hidePopover();
};

const bringFocusRippleHostToFront = (): void => {
  if (!focusRippleRuntime.enabled || document.hidden) {
    return;
  }
  const host = ensureFocusRippleHost();
  if (!supportsFocusRipplePopover(host)) {
    return;
  }
  if (isFocusRippleHostOpen(host)) {
    closeFocusRippleHost(host);
  }
  openFocusRippleHost(host);
};

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

const removeFocusRippleHost = (): void => {
  const hostNode =
    focusRippleRuntime.host ?? document.getElementById(focusRippleHostId);
  if (!hostNode) {
    return;
  }
  if (!(hostNode instanceof HTMLDivElement)) {
    console.error("焦点波纹容器节点类型无效", hostNode);
    return;
  }
  try {
    closeFocusRippleHost(hostNode);
  } catch (error) {
    console.error("焦点波纹容器关闭失败", error);
  }
  hostNode.replaceChildren();
  hostNode.remove();
  if (focusRippleRuntime.host === hostNode) {
    focusRippleRuntime.host = null;
  }
};

const spawnFocusRippleWave = (): void => {
  if (!focusRippleRuntime.enabled || document.hidden) {
    return;
  }
  bringFocusRippleHostToFront();
  const host = ensureFocusRippleHost();
  const hostWidth = Math.max(host.clientWidth, window.innerWidth);
  const wave = document.createElement("div");
  wave.className = focusRippleWaveClassName;
  wave.style.setProperty(
    "--wingmon-focus-ripple-line-scale-start",
    String(focusRippleLineInitialScale),
  );
  wave.style.setProperty(
    "--wingmon-focus-ripple-line-scale-end",
    String(focusRippleLineTargetScale),
  );
  wave.style.setProperty(
    "--wingmon-focus-ripple-travel-x",
    `${String(hostWidth * focusRippleLineTravelDistanceMultiplier)}px`,
  );
  wave.addEventListener(
    "animationend",
    () => {
      wave.remove();
    },
    { once: true },
  );
  host.appendChild(wave);
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

const setFocusRippleEnabled = (enabled: boolean): void => {
  focusRippleRuntime.enabled = enabled;
  registerFocusRippleListeners();
  if (!enabled) {
    stopFocusRipple();
    return;
  }
  startFocusRipple();
};

const contentScriptHandlers: ContentScriptRpcHandlerMap = {
  clickButton: (message, sendResponse) => {
    return handleClickButton(message, sendResponse);
  },
  enterText: (message, sendResponse) => {
    return handleEnterText(message, sendResponse);
  },
  getAllPageContent: (message, sendResponse) => {
    return handleGetAllPageContent(message, sendResponse);
  },
  getPageContent: (message, sendResponse) => {
    return handleGetPageContent(message, sendResponse);
  },
  ping: (_message, sendResponse): void => {
    const body = document.querySelector("body");
    if (!body) {
      sendResponse({ error: "页面没有可用的 body" });
      return;
    }
    sendResponse({ ok: true });
  },
  setFocusRipple: (message, sendResponse): void => {
    setFocusRippleEnabled(message.enabled);
    sendResponse({ enabled: message.enabled, ok: true });
  },
  setPageHash: (message, sendResponse): void => {
    handleSetPageHash(message, sendResponse);
  },
};

const dispatchMessage = <TType extends ContentScriptRequestType>(
  message: ContentScriptRequestByType<TType>,
  sendResponse: (response: ContentScriptResponseByType<TType>) => void,
): boolean | undefined => {
  const handler = contentScriptHandlers[message.type],
    result = handler(message, sendResponse);
  if (result instanceof Promise) {
    void result.catch((error: unknown) => {
      const messageText = extractErrorMessage(error);
      console.error(messageText);
      sendResponse({ error: messageText });
    });
    return true;
  }
  return;
};

const toRuntimeMessageValue = (
  value: unknown,
): object | string | number | boolean | null => {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "object" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
};

const isMessageWithType = (
  value: object | string | number | boolean | null,
): value is { type: unknown } => {
  return typeof value === "object" && value !== null && "type" in value;
};

const registerMessageListener = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void _sender;
    const messageValue = toRuntimeMessageValue(message);
    if (!isContentScriptRequest(messageValue)) {
      if (isMessageWithType(messageValue)) {
        console.error("收到无效的内容脚本 RPC 请求", messageValue);
      }
      return;
    }
    const sendTypedResponse = (
      response: ContentScriptResponseByRequest<typeof messageValue>,
    ): void => {
      sendResponse(response);
    };
    try {
      return dispatchMessage(messageValue, sendTypedResponse);
    } catch (error: unknown) {
      const messageText = extractErrorMessage(error);
      console.error(messageText);
      sendTypedResponse({ error: messageText });
    }
    return;
  });
};

export default registerMessageListener;
