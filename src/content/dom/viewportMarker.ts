const VIEWPORT_MARKER_ATTR = "data-llm-viewport-center";

const insertViewportMarker = (root: HTMLElement | null): HTMLSpanElement => {
  if (!root) {
    throw new Error("页面没有可用的 body");
  }
  const centerX = Math.max(0, Math.floor(window.innerWidth / 2)),
    centerY = Math.max(0, Math.floor(window.innerHeight / 2)),
    centerElement = document.elementFromPoint(centerX, centerY),
    marker = document.createElement("span");
  marker.setAttribute(VIEWPORT_MARKER_ATTR, "true");
  marker.textContent = "";
  if (!centerElement) {
    root.appendChild(marker);
    return marker;
  }
  let insertionTarget: Element = centerElement,
    { parentNode } = centerElement;
  const rootNode = centerElement.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    insertionTarget = rootNode.host;
    parentNode = insertionTarget.parentNode;
  }
  if (!parentNode) {
    root.appendChild(marker);
    return marker;
  }
  if (
    insertionTarget === document.documentElement ||
    insertionTarget === root
  ) {
    root.appendChild(marker);
    return marker;
  }
  parentNode.insertBefore(marker, insertionTarget);
  return marker;
};

export default insertViewportMarker;
