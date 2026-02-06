import { updateSendWithPageButtonState } from "../../../ui/index.ts";
import { getActiveTab } from "../../../core/services/index.ts";
import { isInternalUrl } from "../../../lib/utils/index.ts";

const DEFAULT_PAGE_DISABLED_REASON = "当前标签页不支持携页面发送";

const disableSendWithPageButtonForPage = (reason: string): void => {
  updateSendWithPageButtonState({
    pageAvailable: false,
    pageDisabledReason: reason || DEFAULT_PAGE_DISABLED_REASON,
  });
};

const enableSendWithPageButtonForPage = (): void => {
  updateSendWithPageButtonState({
    pageAvailable: true,
    pageDisabledReason: "",
  });
};

const resolveErrorMessage = (error: Error | null): string => {
  if (!error || !error.message.trim()) {
    return "无法读取活动标签页";
  }
  return error.message;
};

export const setSendWithPagePromptReady = (hasContent: boolean): void => {
  if (typeof hasContent !== "boolean") {
    throw new Error("发送状态必须为布尔值");
  }
  updateSendWithPageButtonState({ promptHasContent: hasContent });
};

export const updateSendWithPageButtonAvailability = async (): Promise<void> => {
  const activeTab = await getActiveTab();
  const activeUrl =
    typeof activeTab.url === "string" ? activeTab.url.trim() : "";
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

export const refreshSendWithPageButton = async (): Promise<void> => {
  try {
    await updateSendWithPageButtonAvailability();
  } catch (error) {
    const resolvedError = error instanceof Error ? error : null;
    const message = resolveErrorMessage(resolvedError);
    disableSendWithPageButtonForPage(message);
    console.error(message, resolvedError);
  }
};
