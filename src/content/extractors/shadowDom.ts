import { llmHiddenAttribute } from "../dom/visibility.js";

const cloneNodeWithShadowDom = (node: Node): Node | null => {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.cloneNode(false);
  }
  const element = node as Element;
  if (element.hasAttribute(llmHiddenAttribute)) {
    return null;
  }
  const cloned = element.cloneNode(false) as Element;
  for (const child of Array.from(element.childNodes)) {
    const clonedChild = cloneNodeWithShadowDom(child);
    if (!clonedChild) {
      continue;
    }
    cloned.appendChild(clonedChild);
  }
  if (element instanceof HTMLElement && element.shadowRoot) {
    const shadowContainer = document.createElement("div");
    shadowContainer.setAttribute("data-shadow-root", "open");
    for (const shadowChild of Array.from(element.shadowRoot.childNodes)) {
      const clonedShadowChild = cloneNodeWithShadowDom(shadowChild);
      if (!clonedShadowChild) {
        continue;
      }
      shadowContainer.appendChild(clonedShadowChild);
    }
    if (shadowContainer.childNodes.length > 0) {
      cloned.appendChild(shadowContainer);
    }
  }
  return cloned;
};

export const cloneBodyWithShadowDom = (body: HTMLElement): HTMLElement => {
  const clonedBody = cloneNodeWithShadowDom(body);
  if (!(clonedBody instanceof HTMLElement)) {
    throw new Error("页面主体克隆失败");
  }
  return clonedBody;
};

export const resolveRenderedText = (body: HTMLElement): string => {
  const text = body.innerText;
  if (typeof text === "string") {
    return text;
  }
  const fallback = body.textContent;
  if (typeof fallback === "string") {
    return fallback;
  }
  return "";
};
