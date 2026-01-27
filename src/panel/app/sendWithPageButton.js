import { sendWithPageButton, statusEl } from "../ui/elements.js";
import { setText } from "../ui/text.js";
import { getActiveTab } from "../services/tabs.js";
import { isInternalUrl } from "../utils/url.js";
const disableSendWithPageButton = (reason) => {
  sendWithPageButton.disabled = true;
  sendWithPageButton.title = reason || "当前标签页不支持携页面发送";
};
const enableSendWithPageButton = () => {
  sendWithPageButton.disabled = false;
  sendWithPageButton.title = "";
};
export const updateSendWithPageButtonAvailability = async () => {
  const activeTab = await getActiveTab();
  if (!activeTab.url) {
    throw new Error("活动标签页缺少 URL");
  }
  if (isInternalUrl(activeTab.url)) {
    disableSendWithPageButton("内部页面不支持携页面发送");
    return;
  }
  enableSendWithPageButton();
};
export const refreshSendWithPageButton = async () => {
  try {
    await updateSendWithPageButtonAvailability();
  } catch (error) {
    const message = error?.message || "无法读取活动标签页";
    disableSendWithPageButton(message);
    setText(statusEl, message);
  }
};
