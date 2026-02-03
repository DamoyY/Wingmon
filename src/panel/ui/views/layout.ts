import { elements } from "../core/elements.ts";

const ensureElement = (
    element: HTMLElement | undefined,
    name: string,
  ): HTMLElement => {
    if (!element) {
      throw new Error(`${name} is required for chat layout.`);
    }
    return element;
  },
  updateChatBarSizes = (): void => {
    const topBarEl = ensureElement(elements.topBar, "Top bar"),
      bottomBarEl = ensureElement(elements.bottomBar, "Bottom bar"),
      chatViewEl = ensureElement(elements.chatView, "Chat view"),
      topHeight = topBarEl.offsetHeight,
      chatViewHeight = chatViewEl.offsetHeight,
      bottomHeight = chatViewHeight * 0.25;
    bottomBarEl.style.height = `${String(bottomHeight)}px`;
    chatViewEl.style.setProperty(
      "--chat-top-bar-height",
      `${String(topHeight)}px`,
    );
    chatViewEl.style.setProperty(
      "--chat-bottom-bar-height",
      `${String(bottomHeight)}px`,
    );
  },
  setupChatLayout = (): (() => void) => {
    ensureElement(elements.chatView, "Chat view");
    const topBar = ensureElement(elements.topBar, "Top bar"),
      bottomBar = ensureElement(elements.bottomBar, "Bottom bar");
    updateChatBarSizes();
    const observer = new ResizeObserver(updateChatBarSizes);
    observer.observe(topBar);
    observer.observe(bottomBar);
    const onResize = () => {
      updateChatBarSizes();
    };
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
