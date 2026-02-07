import {
  elements,
  prefersReducedMotion,
} from "../../../ui/foundation/index.ts";

const BUTTON_VISIBILITY_DURATION = 180;
const BUTTON_VISIBILITY_EASING = "cubic-bezier(0.2, 0, 0, 1)";
let visibilitySwapToken = 0;

type ComposerButtonElement = (typeof elements)["sendButton"];
type ComposerButtons = {
  sendButton: (typeof elements)["sendButton"];
  sendWithPageButton: (typeof elements)["sendWithPageButton"];
  stopButton: (typeof elements)["stopButton"];
};

const ensureSendButton = (): ComposerButtonElement => elements.sendButton;

const ensureComposerButtons = (): ComposerButtons => {
  const { sendButton, sendWithPageButton, stopButton } = elements;
  return { sendButton, sendWithPageButton, stopButton };
};

const finalizeVisibility = (
  element: ComposerButtonElement,
  shouldShow: boolean,
): void => {
  const target = element;
  target.style.opacity = "";
  target.style.pointerEvents = "";
  if (!shouldShow) {
    target.classList.add("hidden");
  }
};

const animateButtonVisibility = async (
  button: ComposerButtonElement,
  shouldShow: boolean,
): Promise<void> => {
  const target = button;
  const targetState = shouldShow ? "show" : "hide";
  const isHidden = target.classList.contains("hidden");
  target.dataset.visibilityTarget = targetState;
  if (prefersReducedMotion()) {
    target.classList.toggle("hidden", !shouldShow);
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return;
  }
  target.getAnimations().forEach((animation) => {
    animation.cancel();
  });
  if (shouldShow && !isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return;
  }
  if (!shouldShow && isHidden) {
    target.style.opacity = "";
    target.style.pointerEvents = "";
    delete target.dataset.visibilityTarget;
    return;
  }
  if (shouldShow) {
    target.classList.remove("hidden");
    target.style.pointerEvents = "";
  } else {
    target.style.pointerEvents = "none";
  }
  await new Promise<void>((resolve) => {
    const animation = target.animate(
      [{ opacity: shouldShow ? 0 : 1 }, { opacity: shouldShow ? 1 : 0 }],
      {
        duration: BUTTON_VISIBILITY_DURATION,
        easing: BUTTON_VISIBILITY_EASING,
        fill: "both",
      },
    );
    let finalized = false;
    const finalize = (): void => {
      if (finalized) {
        return;
      }
      finalized = true;
      if (target.dataset.visibilityTarget === targetState) {
        finalizeVisibility(target, shouldShow);
        delete target.dataset.visibilityTarget;
      }
      animation.cancel();
      resolve();
    };
    animation.addEventListener("finish", finalize, { once: true });
    animation.addEventListener("cancel", finalize, { once: true });
  });
};

const swapComposerButtons = async (
  token: number,
  sending: boolean,
  sendButton: ComposerButtonElement,
  sendWithPageButton: ComposerButtonElement,
  stopButton: ComposerButtonElement,
): Promise<void> => {
  if (sending) {
    await Promise.all([
      animateButtonVisibility(sendButton, false),
      animateButtonVisibility(sendWithPageButton, false),
    ]);
    if (token !== visibilitySwapToken) {
      return;
    }
    await animateButtonVisibility(stopButton, true);
    return;
  }
  await animateButtonVisibility(stopButton, false);
  if (token !== visibilitySwapToken) {
    return;
  }
  await Promise.all([
    animateButtonVisibility(sendButton, true),
    animateButtonVisibility(sendWithPageButton, true),
  ]);
};

export const setComposerButtonsSending = (sending: boolean): void => {
  const { sendButton, sendWithPageButton, stopButton } =
    ensureComposerButtons();
  visibilitySwapToken += 1;
  const token = visibilitySwapToken;
  swapComposerButtons(
    token,
    sending,
    sendButton,
    sendWithPageButton,
    stopButton,
  ).catch((error: unknown) => {
    const resolvedError = error instanceof Error ? error : null;
    console.error("发送按钮状态切换失败", resolvedError);
  });
};

export const setSendButtonEnabled = (enabled: boolean): void => {
  const sendButton = ensureSendButton();
  sendButton.disabled = !enabled;
};
