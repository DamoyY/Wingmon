import { computeAccessibleName } from "dom-accessibility-api";

const normalizeText = (value?: string | null): string => (value ?? "").trim();

const resolveOwnerWindow = (element: Element): Window => {
  const win = element.ownerDocument.defaultView;
  if (!win) {
    throw new Error("无法获取节点所属窗口");
  }
  return win;
};

const resolveElementAccessibleName = (element: Element): string => {
  const win = resolveOwnerWindow(element);
  const getComputedStyle: typeof window.getComputedStyle = (
    target,
    pseudoElement,
  ): CSSStyleDeclaration => win.getComputedStyle(target, pseudoElement);
  return normalizeText(
    computeAccessibleName(element, {
      computedStyleSupportsPseudoElements: true,
      getComputedStyle,
    }),
  );
};

export { normalizeText, resolveElementAccessibleName };
