export type FocusRippleRuntime = {
  enabled: boolean;
  host: HTMLDivElement | null;
  intervalId: number | null;
  observer: MutationObserver | null;
  restackFrameId: number | null;
  listenersReady: boolean;
};

export const focusRippleRuntime: FocusRippleRuntime = {
  enabled: false,
  host: null,
  intervalId: null,
  observer: null,
  restackFrameId: null,
  listenersReady: false,
};
