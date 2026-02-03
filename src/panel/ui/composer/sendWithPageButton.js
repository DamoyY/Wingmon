import { elements } from "../core/elements.ts";

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送",
  DEFAULT_EMPTY_PROMPT_REASON = "请输入内容后发送",
  resolvePageDisabledReason = (value) => {
    if (typeof value !== "string" || !value.trim()) {
      return DEFAULT_PAGE_DISABLED_REASON;
    }
    return value;
  },
  ensureSendWithPageButton = () => {
    const { sendWithPageButton } = elements;
    if (!sendWithPageButton) {
      throw new Error("携页面发送按钮未找到");
    }
    return sendWithPageButton;
  },
  readSendWithPageState = () => {
    const { dataset } = ensureSendWithPageButton();
    return {
      pageAvailable: dataset.pageAvailable === "true",
      promptHasContent: dataset.promptHasContent === "true",
      pageDisabledReason: resolvePageDisabledReason(dataset.pageDisabledReason),
    };
  },
  writeSendWithPageState = (state) => {
    const target = ensureSendWithPageButton();
    target.dataset.pageAvailable = String(Boolean(state.pageAvailable));
    target.dataset.promptHasContent = String(Boolean(state.promptHasContent));
    if (typeof state.pageDisabledReason === "string") {
      target.dataset.pageDisabledReason = state.pageDisabledReason;
    } else {
      delete target.dataset.pageDisabledReason;
    }
  },
  applySendWithPageState = (state) => {
    const target = ensureSendWithPageButton();
    if (state.pageAvailable && state.promptHasContent) {
      target.disabled = false;
      target.title = "";
      return;
    }
    target.disabled = true;
    if (!state.pageAvailable) {
      target.title = state.pageDisabledReason || DEFAULT_PAGE_DISABLED_REASON;
      return;
    }
    target.title = DEFAULT_EMPTY_PROMPT_REASON;
  },
  updateSendWithPageButtonState = (patch) => {
    if (!patch || typeof patch !== "object") {
      throw new Error("携页面发送按钮更新必须提供对象");
    }
    const current = readSendWithPageState(),
      next = { ...current, ...patch };
    writeSendWithPageState(next);
    applySendWithPageState(next);
    return next;
  };

export default updateSendWithPageButtonState;
