import { elements } from "./elements.js";

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送";
const DEFAULT_EMPTY_PROMPT_REASON = "请输入内容后发送";

const resolvePageDisabledReason = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_PAGE_DISABLED_REASON;
  }
  return value;
};

const ensureSendWithPageButton = () => {
  const { sendWithPageButton } = elements;
  if (!sendWithPageButton) {
    throw new Error("携页面发送按钮未找到");
  }
  return sendWithPageButton;
};

const readSendWithPageState = () => {
  const { dataset } = ensureSendWithPageButton();
  return {
    pageAvailable: dataset.pageAvailable === "true",
    promptHasContent: dataset.promptHasContent === "true",
    pageDisabledReason: resolvePageDisabledReason(dataset.pageDisabledReason),
  };
};

const writeSendWithPageState = (state) => {
  const target = ensureSendWithPageButton();
  target.dataset.pageAvailable = String(Boolean(state.pageAvailable));
  target.dataset.promptHasContent = String(Boolean(state.promptHasContent));
  if (typeof state.pageDisabledReason === "string") {
    target.dataset.pageDisabledReason = state.pageDisabledReason;
  } else {
    delete target.dataset.pageDisabledReason;
  }
};

const applySendWithPageState = (state) => {
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
};

const updateSendWithPageButtonState = (patch) => {
  if (!patch || typeof patch !== "object") {
    throw new Error("携页面发送按钮更新必须提供对象");
  }
  const current = readSendWithPageState();
  const next = { ...current, ...patch };
  writeSendWithPageState(next);
  applySendWithPageState(next);
  return next;
};

export default updateSendWithPageButtonState;
