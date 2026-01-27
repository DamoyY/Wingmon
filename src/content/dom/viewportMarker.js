const VIEWPORT_MARKER_ATTR = "data-llm-viewport-center";
const insertViewportMarker = (root) => {
  if (!root) {
    throw new Error("页面没有可用的 body");
  }
  const centerX = Math.max(0, Math.floor(window.innerWidth / 2));
  const centerY = Math.max(0, Math.floor(window.innerHeight / 2));
  const centerElement = document.elementFromPoint(centerX, centerY);
  const marker = document.createElement("span");
  marker.setAttribute(VIEWPORT_MARKER_ATTR, "true");
  marker.textContent = "";
  if (!centerElement) {
    root.appendChild(marker);
    return marker;
  }
  let insertionTarget = centerElement;
  let { parentNode } = centerElement;
  if (typeof centerElement.getRootNode === "function") {
    const rootNode = centerElement.getRootNode();
    if (rootNode && rootNode instanceof ShadowRoot && rootNode.host) {
      insertionTarget = rootNode.host;
      parentNode = insertionTarget.parentNode;
    }
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
