const cloneNodeWithShadowDom = (node: Node): Node => {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.cloneNode(false);
  }
  const element = node as Element,
    cloned = element.cloneNode(false) as Element;
  for (const child of Array.from(element.childNodes)) {
    cloned.appendChild(cloneNodeWithShadowDom(child));
  }
  if (element instanceof HTMLElement && element.shadowRoot) {
    const shadowContainer = document.createElement("div");
    shadowContainer.setAttribute("data-shadow-root", "open");
    for (const shadowChild of Array.from(element.shadowRoot.childNodes)) {
      shadowContainer.appendChild(cloneNodeWithShadowDom(shadowChild));
    }
    if (shadowContainer.childNodes.length > 0) {
      cloned.appendChild(shadowContainer);
    }
  }
  return cloned;
};

export const cloneBodyWithShadowDom = (body: HTMLElement): HTMLElement =>
  cloneNodeWithShadowDom(body) as HTMLElement;

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
