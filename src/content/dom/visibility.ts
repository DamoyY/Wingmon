type ElementWithCheckVisibility = Element & {
  checkVisibility?: (options?: {
    checkOpacity?: boolean;
    checkVisibilityCSS?: boolean;
  }) => boolean;
};

export type ElementVisibilityOptions = Readonly<{
  minimumHeight: number;
  minimumWidth: number;
  requirePointerEvents: boolean;
}>;

export const llmHiddenAttribute = "data-llm-hidden";

const traverseElementsWithShadowDom = (
  root: Element,
  visitor: (element: Element) => void,
): void => {
  const stack: Element[] = [root];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) {
      continue;
    }
    visitor(element);
    const lightChildren = Array.from(element.children);
    for (let index = lightChildren.length - 1; index >= 0; index -= 1) {
      stack.push(lightChildren[index]);
    }
    if (element instanceof HTMLElement && element.shadowRoot) {
      const shadowChildren = Array.from(element.shadowRoot.children);
      for (let index = shadowChildren.length - 1; index >= 0; index -= 1) {
        stack.push(shadowChildren[index]);
      }
    }
  }
};

const isElementHiddenForMarkdownSnapshot = (
  element: Element,
  win: Window,
): boolean => {
  const style = win.getComputedStyle(element);
  if (style.display === "none") {
    return true;
  }
  if (style.visibility === "hidden" || style.visibility === "collapse") {
    return true;
  }
  if (style.contentVisibility === "hidden") {
    return true;
  }
  const opacity = Number(style.opacity);
  if (Number.isFinite(opacity) && opacity <= 0) {
    return true;
  }
  return false;
};

export const markHiddenElementsForMarkdown = (root: Element): void => {
  const win = root.ownerDocument.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  traverseElementsWithShadowDom(root, (element) => {
    if (element === root) {
      element.removeAttribute(llmHiddenAttribute);
      return;
    }
    if (isElementHiddenForMarkdownSnapshot(element, win)) {
      element.setAttribute(llmHiddenAttribute, "true");
      return;
    }
    element.removeAttribute(llmHiddenAttribute);
  });
};

export const clearHiddenElementsForMarkdown = (root: Element): void => {
  traverseElementsWithShadowDom(root, (element) => {
    element.removeAttribute(llmHiddenAttribute);
  });
};

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
