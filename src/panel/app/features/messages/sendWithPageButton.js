import { updateSendWithPageButtonState } from "../../../ui/index.ts";
import { getActiveTab } from "../../../services/index.ts";
import { isInternalUrl } from "../../../utils/index.ts";

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送",
  disableSendWithPageButtonForPage = (reason) => {
    updateSendWithPageButtonState({
      pageAvailable: false,
      pageDisabledReason: reason || DEFAULT_PAGE_DISABLED_REASON,
    });
  },
  enableSendWithPageButtonForPage = () => {
    updateSendWithPageButtonState({
      pageAvailable: true,
      pageDisabledReason: "",
    });
  };

export const setSendWithPagePromptReady = (hasContent) => {
  if (typeof hasContent !== "boolean") {
    throw new Error("发送状态必须为布尔值");
  }
  updateSendWithPageButtonState({ promptHasContent: hasContent });
};
export const updateSendWithPageButtonAvailability = async () => {
  const activeTab = await getActiveTab(),
    activeUrl = typeof activeTab?.url === "string" ? activeTab.url.trim() : "";
  if (!activeUrl) {
    disableSendWithPageButtonForPage("当前标签页缺少 URL");
    return;
  }
  if (isInternalUrl(activeUrl)) {
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
    console.error(message);
  }
};
