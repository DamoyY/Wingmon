const MESSAGE_STATUS_SELECTOR = ".message-status";

export const createMessageStatusLine = (
  statusText: string,
): HTMLDivElement | null => {
  if (!statusText) {
    return null;
  }
  const status = document.createElement("div");
  status.className = "message-status status md-typescale-label-small";
  status.textContent = statusText;
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
      existing.textContent = statusText;
    }
    return;
  }
  const status = createMessageStatusLine(statusText);
  if (!status) {
    throw new Error("消息状态行创建失败");
  }
  messageEl.appendChild(status);
};
