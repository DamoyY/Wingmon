import { elements } from "../../../ui/foundation/elements.ts";

export type SendWithPageButtonState = {
  pageAvailable: boolean;
  promptHasContent: boolean;
  pageDisabledReason: string;
};

type SendWithPageButtonStatePatch = Partial<SendWithPageButtonState>;

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送";
const DEFAULT_EMPTY_PROMPT_REASON = "请输入内容后发送";

const resolvePageDisabledReason = (
  value: string | null | undefined,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_PAGE_DISABLED_REASON;
  }
  return value;
};

const ensureSendWithPageButton = (): (typeof elements)["sendWithPageButton"] =>
  elements.sendWithPageButton;

const readSendWithPageState = (): SendWithPageButtonState => {
  const { dataset } = ensureSendWithPageButton();
  return {
    pageAvailable: dataset.pageAvailable === "true",
    pageDisabledReason: resolvePageDisabledReason(dataset.pageDisabledReason),
    promptHasContent: dataset.promptHasContent === "true",
  };
};

const writeSendWithPageState = (state: SendWithPageButtonState): void => {
  const target = ensureSendWithPageButton();
  target.dataset.pageAvailable = String(state.pageAvailable);
  target.dataset.promptHasContent = String(state.promptHasContent);
  target.dataset.pageDisabledReason = state.pageDisabledReason;
};

const applySendWithPageState = (state: SendWithPageButtonState): void => {
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

const updateSendWithPageButtonState = (
  patch: SendWithPageButtonStatePatch,
): SendWithPageButtonState => {
  const current = readSendWithPageState();
  const next = { ...current, ...patch };
  writeSendWithPageState(next);
  applySendWithPageState(next);
  return next;
};

export default updateSendWithPageButtonState;
