import { elements } from "./elements.js";

const ensureElement = (element, name) => {
  if (!element) {
    throw new Error(`${name} is required for chat layout.`);
  }
  return element;
};

const updateChatBarSizes = () => {
  const topBarEl = ensureElement(elements.topBar, "Top bar");
  const bottomBarEl = ensureElement(elements.bottomBar, "Bottom bar");
  const chatViewEl = ensureElement(elements.chatView, "Chat view");
  const topHeight = topBarEl.offsetHeight;
  const chatViewHeight = chatViewEl.offsetHeight;
  const bottomHeight = chatViewHeight * 0.25;
  if (!Number.isFinite(topHeight) || topHeight <= 0) {
    throw new Error("Top bar height is invalid.");
  }
  if (!Number.isFinite(bottomHeight) || bottomHeight <= 0) {
    throw new Error("Bottom bar height is invalid.");
  }
  bottomBarEl.style.height = `${bottomHeight}px`;
  chatViewEl.style.setProperty("--chat-top-bar-height", `${topHeight}px`);
  chatViewEl.style.setProperty("--chat-bottom-bar-height", `${bottomHeight}px`);
};

const setupChatLayout = () => {
  ensureElement(elements.chatView, "Chat view");
  const topBar = ensureElement(elements.topBar, "Top bar");
  const bottomBar = ensureElement(elements.bottomBar, "Bottom bar");
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
