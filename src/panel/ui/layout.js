import { chatView, topBar, bottomBar } from "./elements.js";

const ensureElement = (element, name) => {
  if (!element) {
    throw new Error(`${name} is required for chat layout.`);
  }
  return element;
};

const updateChatBarSizes = () => {
  const topBarEl = ensureElement(topBar, "Top bar");
  const bottomBarEl = ensureElement(bottomBar, "Bottom bar");
  const chatViewEl = ensureElement(chatView, "Chat view");
  const topHeight = topBarEl.offsetHeight;
  const bottomHeight = bottomBarEl.offsetHeight;
  if (!Number.isFinite(topHeight) || topHeight <= 0) {
    throw new Error("Top bar height is invalid.");
  }
  if (!Number.isFinite(bottomHeight) || bottomHeight <= 0) {
    throw new Error("Bottom bar height is invalid.");
  }
  chatViewEl.style.setProperty("--chat-top-bar-height", `${topHeight}px`);
  chatViewEl.style.setProperty("--chat-bottom-bar-height", `${bottomHeight}px`);
};

const setupChatLayout = () => {
  ensureElement(chatView, "Chat view");
  ensureElement(topBar, "Top bar");
  ensureElement(bottomBar, "Bottom bar");
  updateChatBarSizes();
  const observer = new ResizeObserver(updateChatBarSizes);
  observer.observe(topBar);
  observer.observe(bottomBar);
  const onResize = () => updateChatBarSizes();
  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", onResize);
    }
  };
};

export default setupChatLayout;
