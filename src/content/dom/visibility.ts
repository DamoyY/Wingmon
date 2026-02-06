type ElementWithCheckVisibility = Element & {
  checkVisibility?: (options?: {
    checkOpacity?: boolean;
    checkVisibilityCSS?: boolean;
  }) => boolean;
};

export type ElementVisibilityOptions = Readonly<{
  minimumWidth: number;
  minimumHeight: number;
  requirePointerEvents: boolean;
}>;

const isVisibleByFallback = (
  element: Element,
  style: CSSStyleDeclaration,
): boolean => {
  if (
    style.display === "none" ||
    style.display === "contents" ||
    style.visibility === "hidden" ||
    style.visibility === "collapse"
  ) {
    return false;
  }
  const opacity = Number(style.opacity);
  if (Number.isFinite(opacity) && opacity <= 0) {
    return false;
  }
  if (
    element instanceof HTMLElement &&
    element.offsetParent === null &&
    style.position !== "fixed"
  ) {
    return false;
  }
  return true;
};

export const isElementVisible = (
  element: Element,
  win: Window,
  options: ElementVisibilityOptions,
): boolean => {
  const style = win.getComputedStyle(element);
  const visibilityChecker = (element as ElementWithCheckVisibility)
    .checkVisibility;
  if (typeof visibilityChecker === "function") {
    if (
      !visibilityChecker.call(element, {
        checkOpacity: true,
        checkVisibilityCSS: true,
      })
    ) {
      return false;
    }
  } else if (!isVisibleByFallback(element, style)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (
    rect.width < options.minimumWidth ||
    rect.height < options.minimumHeight
  ) {
    return false;
  }
  if (options.requirePointerEvents && style.pointerEvents === "none") {
    return false;
  }
  return true;
};
