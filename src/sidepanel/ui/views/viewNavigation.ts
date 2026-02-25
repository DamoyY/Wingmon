import { elements, prefersReducedMotion } from "../foundation/index.ts";

const ANIMATION_DURATION = 320,
  ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)",
  PANEL_PRIMARY_VIEW_STORAGE_KEY = "panel_primary_view";

type PanelPrimaryView = "chat" | "key" | "history";

let isAnimating = false;

const persistPanelPrimaryView = (view: PanelPrimaryView): void => {
    void chrome.storage.local
      .set({ [PANEL_PRIMARY_VIEW_STORAGE_KEY]: view })
      .catch((error: unknown) => {
        console.error("持久化侧边栏视图状态失败", error);
      });
  },
  resolvePanelPrimaryView = (
    value: string | undefined,
  ): PanelPrimaryView | null => {
    if (value === undefined) {
      return null;
    }
    if (value === "chat" || value === "key" || value === "history") {
      return value;
    }
    console.error("侧边栏视图状态无效", { value });
    return null;
  },
  resetViewStyles = (view: HTMLElement): void => {
    const target = view,
      { style } = target;
    style.transform = "";
    style.opacity = "";
    style.zIndex = "";
    style.pointerEvents = "";
  },
  setKeyViewHintState = (isFirstUse: boolean): void => {
    const { settingsHint, cancelSettings } = elements as Partial<
      typeof elements
    >;
    if (!settingsHint || !cancelSettings) {
      throw new Error("设置视图元素未初始化");
    }
    settingsHint.classList.toggle("hidden", !isFirstUse);
    cancelSettings.classList.toggle("hidden", isFirstUse);
  },
  resolveActiveView = (): HTMLElement => {
    const { historyView, keyView, chatView } = elements as Partial<
      typeof elements
    >;
    if (historyView && !historyView.classList.contains("hidden")) {
      return historyView;
    }
    if (keyView && !keyView.classList.contains("hidden")) {
      return keyView;
    }
    if (chatView && !chatView.classList.contains("hidden")) {
      return chatView;
    }
    if (!chatView) {
      throw new Error("聊天视图元素未初始化");
    }
    return chatView;
  },
  animateSwap = async ({
    incoming,
    outgoing,
    incomingFrom,
    outgoingTo,
    onComplete,
  }: {
    incoming: HTMLElement;
    outgoing: HTMLElement;
    incomingFrom: string;
    outgoingTo: string;
    onComplete?: () => void;
  }): Promise<void> => {
    if (isAnimating) {
      return;
    }
    if (prefersReducedMotion()) {
      const incomingView = incoming,
        outgoingView = outgoing;
      outgoingView.classList.add("hidden");
      incomingView.classList.remove("hidden");
      resetViewStyles(outgoingView);
      resetViewStyles(incomingView);
      onComplete?.();
      return;
    }
    isAnimating = true;
    const incomingView = incoming,
      outgoingView = outgoing;
    incomingView.classList.remove("hidden");
    outgoingView.classList.remove("hidden");
    resetViewStyles(incomingView);
    resetViewStyles(outgoingView);
    incomingView.style.zIndex = "2";
    outgoingView.style.zIndex = "1";
    incomingView.style.pointerEvents = "none";
    outgoingView.style.pointerEvents = "none";
    const incomingAnimation = incomingView.animate(
        [
          { opacity: 0, transform: `translateX(${incomingFrom})` },
          { opacity: 1, transform: "translateX(0)" },
        ],
        {
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
          fill: "both",
        },
      ),
      outgoingAnimation = outgoingView.animate(
        [
          { opacity: 1, transform: "translateX(0)" },
          { opacity: 0, transform: `translateX(${outgoingTo})` },
        ],
        {
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
          fill: "both",
        },
      );
    try {
      await Promise.all([
        incomingAnimation.finished,
        outgoingAnimation.finished,
      ]);
    } finally {
      incomingAnimation.cancel();
      isAnimating = false;
      onComplete?.();
      outgoingAnimation.cancel();
      outgoingView.classList.add("hidden");
      resetViewStyles(outgoingView);
      resetViewStyles(incomingView);
    }
  };

export const getStoredPanelPrimaryView =
  async (): Promise<PanelPrimaryView | null> => {
    try {
      const storage = await chrome.storage.local.get<
        Record<typeof PANEL_PRIMARY_VIEW_STORAGE_KEY, string | undefined>
      >(PANEL_PRIMARY_VIEW_STORAGE_KEY);
      return resolvePanelPrimaryView(storage[PANEL_PRIMARY_VIEW_STORAGE_KEY]);
    } catch (error) {
      console.error("读取侧边栏视图状态失败", error);
      return null;
    }
  };

export const showKeyView = ({
  isFirstUse = false,
  animate = false,
}: { isFirstUse?: boolean; animate?: boolean } = {}): Promise<void> => {
  const { keyView, chatView, historyView, keyStatus } = elements as Partial<
    typeof elements
  >;
  if (!keyView || !chatView || !historyView || !keyStatus) {
    throw new Error("视图元素未初始化");
  }
  persistPanelPrimaryView("key");
  if (!animate) {
    keyView.classList.remove("hidden");
    chatView.classList.add("hidden");
    historyView.classList.add("hidden");
    resetViewStyles(chatView);
    resetViewStyles(historyView);
    resetViewStyles(keyView);
  }
  keyStatus.textContent = "";
  setKeyViewHintState(isFirstUse);
  if (animate) {
    return animateSwap({
      incoming: keyView,
      incomingFrom: "100%",
      outgoing: chatView,
      outgoingTo: "-100%",
    });
  }
  return Promise.resolve();
};

export const showChatView = ({
  animate = false,
}: { animate?: boolean } = {}): Promise<void> => {
  const { keyView, historyView, chatView, promptEl } = elements as Partial<
    typeof elements
  >;
  if (!keyView || !historyView || !chatView || !promptEl) {
    throw new Error("视图元素未初始化");
  }
  persistPanelPrimaryView("chat");
  if (animate) {
    const outgoingView = resolveActiveView();
    return animateSwap({
      incoming: chatView,
      incomingFrom: "-100%",
      onComplete: () => {
        promptEl.focus();
      },
      outgoing: outgoingView,
      outgoingTo: "100%",
    });
  }
  keyView.classList.add("hidden");
  historyView.classList.add("hidden");
  chatView.classList.remove("hidden");
  resetViewStyles(keyView);
  resetViewStyles(historyView);
  resetViewStyles(chatView);
  promptEl.focus();
  return Promise.resolve();
};

export const showHistoryView = ({
  animate = false,
}: { animate?: boolean } = {}): Promise<void> => {
  const { keyView, historyView, chatView } = elements as Partial<
    typeof elements
  >;
  if (!keyView || !historyView || !chatView) {
    throw new Error("视图元素未初始化");
  }
  persistPanelPrimaryView("history");
  if (!animate) {
    historyView.classList.remove("hidden");
    chatView.classList.add("hidden");
    keyView.classList.add("hidden");
    resetViewStyles(chatView);
    resetViewStyles(keyView);
    resetViewStyles(historyView);
    return Promise.resolve();
  }
  return animateSwap({
    incoming: historyView,
    incomingFrom: "100%",
    outgoing: chatView,
    outgoingTo: "-100%",
  });
};
