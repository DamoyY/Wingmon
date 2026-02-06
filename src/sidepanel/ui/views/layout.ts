import { elements } from "../core/elements.ts";
import { ensureElement } from "../../lib/utils/index.ts";

const updateChatBarSizes = (): void => {
    const topBarEl = ensureElement(
        elements.topBar,
        "Top bar",
        "Top bar is required for chat layout.",
      ),
      bottomBarEl = ensureElement(
        elements.bottomBar,
        "Bottom bar",
        "Bottom bar is required for chat layout.",
      ),
      chatViewEl = ensureElement(
        elements.chatView,
        "Chat view",
        "Chat view is required for chat layout.",
      ),
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
    ensureElement(
      elements.chatView,
      "Chat view",
      "Chat view is required for chat layout.",
    );
    const topBar = ensureElement(
        elements.topBar,
        "Top bar",
        "Top bar is required for chat layout.",
      ),
      bottomBar = ensureElement(
        elements.bottomBar,
        "Bottom bar",
        "Bottom bar is required for chat layout.",
      );
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
