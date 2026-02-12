const MESSAGE_STATUS_SELECTOR = ".message-status";
const TRAILING_DOT_PATTERN = /^(.*?)(\.+)$/u;
const MIN_DOT_SLOT_WIDTH_CH = 3;

type ParsedTrailingDots = {
  baseText: string;
  dotCount: number;
  slotWidth: number;
};

const parseTrailingDots = (statusText: string): ParsedTrailingDots | null => {
  const matched = TRAILING_DOT_PATTERN.exec(statusText);
  if (!matched) {
    return null;
  }
  const [, baseText, dots] = matched;
  if (!dots) {
    return null;
  }
  const dotCount = dots.length;
  return {
    baseText,
    dotCount,
    slotWidth: Math.max(dotCount, MIN_DOT_SLOT_WIDTH_CH),
  };
};

const createStatusDotSlot = (
  dotCount: number,
  slotWidth: number,
): HTMLSpanElement => {
  const dotSlot = document.createElement("span");
  dotSlot.className = "message-status-dots";
  dotSlot.style.setProperty(
    "--message-status-dot-slot-width",
    `${String(slotWidth)}ch`,
  );
  dotSlot.textContent = ".".repeat(dotCount);
  return dotSlot;
};

const setStatusLineContent = (
  statusLine: HTMLDivElement | HTMLElement,
  statusText: string,
): void => {
  const parsed = parseTrailingDots(statusText);
  if (!parsed) {
    statusLine.textContent = statusText;
    return;
  }
  const baseText = document.createElement("span");
  baseText.className = "message-status-text";
  baseText.textContent = parsed.baseText;
  const dotSlot = createStatusDotSlot(parsed.dotCount, parsed.slotWidth);
  statusLine.replaceChildren(baseText, dotSlot);
};

export const createMessageStatusLine = (
  statusText: string,
): HTMLDivElement | null => {
  if (!statusText) {
    return null;
  }
  const status = document.createElement("div");
  status.className = "message-status status md-typescale-label-small";
  setStatusLineContent(status, statusText);
  return status;
};

const findMessageStatusLine = (messageEl: HTMLElement): HTMLElement | null => {
  const existing = messageEl.querySelector(MESSAGE_STATUS_SELECTOR);
  if (!(existing instanceof HTMLElement)) {
    return null;
  }
  return existing;
};

export const updateMessageStatusLine = (
  messageEl: HTMLElement,
  statusText: string,
): void => {
  const existing = findMessageStatusLine(messageEl);
  if (!statusText) {
    if (existing) {
      existing.remove();
    }
    return;
  }
  if (existing) {
    if (existing.textContent !== statusText) {
      setStatusLineContent(existing, statusText);
    }
    return;
  }
  const status = createMessageStatusLine(statusText);
  if (!status) {
    throw new Error("消息状态行创建失败");
  }
  messageEl.appendChild(status);
};
