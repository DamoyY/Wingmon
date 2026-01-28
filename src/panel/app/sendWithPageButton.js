import { sendWithPageButton, setText, statusEl } from "../ui/index.js";
import { getActiveTab } from "../services/index.js";
import { isInternalUrl } from "../utils/index.js";

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送";
const DEFAULT_EMPTY_PROMPT_REASON = "请输入内容后发送";
let pageAvailable = false;
let pageDisabledReason = DEFAULT_PAGE_DISABLED_REASON;
let promptHasContent = false;

const applySendWithPageState = () => {
  if (pageAvailable && promptHasContent) {
    sendWithPageButton.disabled = false;
    sendWithPageButton.title = "";
    return;
  }
  sendWithPageButton.disabled = true;
  if (!pageAvailable) {
    sendWithPageButton.title =
      pageDisabledReason || DEFAULT_PAGE_DISABLED_REASON;
    return;
  }
  sendWithPageButton.title = DEFAULT_EMPTY_PROMPT_REASON;
};

const disableSendWithPageButtonForPage = (reason) => {
  pageAvailable = false;
  pageDisabledReason = reason || DEFAULT_PAGE_DISABLED_REASON;
  applySendWithPageState();
};
const enableSendWithPageButtonForPage = () => {
  pageAvailable = true;
  pageDisabledReason = "";
  applySendWithPageState();
};

export const setSendWithPagePromptReady = (hasContent) => {
  if (typeof hasContent !== "boolean") {
    throw new Error("发送状态必须为布尔值");
  }
  promptHasContent = hasContent;
  applySendWithPageState();
};
export const updateSendWithPageButtonAvailability = async () => {
  const activeTab = await getActiveTab();
  if (!activeTab.url) {
    throw new Error("活动标签页缺少 URL");
  }
  if (isInternalUrl(activeTab.url)) {
    disableSendWithPageButtonForPage("内部页面不支持携页面发送");
    return;
  }
  enableSendWithPageButtonForPage();
};
export const refreshSendWithPageButton = async () => {
  try {
    await updateSendWithPageButtonAvailability();
  } catch (error) {
    const message = error?.message || "无法读取活动标签页";
    disableSendWithPageButtonForPage(message);
    setText(statusEl, message);
  }
};
