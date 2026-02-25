import {
  focusRippleHostId,
  focusRippleLineInitialScale,
  focusRippleLineTargetScale,
  focusRippleLineTravelDistanceMultiplier,
  focusRipplePopoverMode,
  focusRippleStyleId,
  focusRippleStyles,
  focusRippleWaveClassName,
} from "./constants.js";
import { focusRippleRuntime } from "./runtime.js";

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

export const ensureFocusRippleStyle = (): HTMLStyleElement => {
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

export const ensureFocusRippleHost = (): HTMLDivElement => {
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

export const bringFocusRippleHostToFront = (): void => {
  const host = ensureFocusRippleHost();
  if (!supportsFocusRipplePopover(host)) {
    return;
  }
  if (isFocusRippleHostOpen(host)) {
    closeFocusRippleHost(host);
  }
  openFocusRippleHost(host);
};

export const removeFocusRippleHost = (): void => {
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

export const spawnFocusRippleWave = (): void => {
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
