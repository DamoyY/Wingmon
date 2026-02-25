export const focusRippleHostId = "wingmon-focus-ripple-host";
export const focusRippleStyleId = "wingmon-focus-ripple-style";
export const focusRippleWaveClassName = "wingmon-focus-ripple-wave";
export const focusRippleDurationMs = 2200;
export const focusRippleConcurrentWaveCount = 2;
export const focusRippleMotionEasing = "cubic-bezier(0.2, 0, 0, 1)";
export const focusRipplePopoverMode = "manual";
export const focusRippleTopLayerCandidateSelector = "dialog, [popover]";
export const focusRippleSpawnIntervalMs = Math.round(
  focusRippleDurationMs / focusRippleConcurrentWaveCount,
);
export const focusRippleLineInitialScale = 0.02;
export const focusRippleLineTargetScale = 1.38;
export const focusRippleLineTravelDistanceMultiplier = 1.05;

export const focusRippleStyles = `
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
