const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
let hasLoggedMissingMatchMedia = false;

const reportMatchMediaUnavailable = (): void => {
  if (hasLoggedMissingMatchMedia) {
    return;
  }
  hasLoggedMissingMatchMedia = true;
  console.error("matchMedia 不可用，无法检测减弱动态效果设置");
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") {
    reportMatchMediaUnavailable();
    return false;
  }
  if (typeof window.matchMedia !== "function") {
    reportMatchMediaUnavailable();
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};
