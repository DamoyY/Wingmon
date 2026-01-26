import { sendWithPageButton, statusEl } from "../ui/elements.js";
import { setText } from "../ui/text.js";
import { getActiveTab } from "../services/tabs.js";
import { normalizeUrl } from "../utils/url.js";
const isNewTabUrl = (url) => {
  const normalized = normalizeUrl(url);
  return (
    normalized === "chrome://newtab/" ||
    normalized === "chrome://new-tab-page/" ||
    normalized === "chrome://new-tab-page"
  );
};
const isChromeInternalUrl = (url) => normalizeUrl(url).startsWith("chrome://");
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
  const normalizedUrl = normalizeUrl(activeTab.url);
  if (isNewTabUrl(normalizedUrl)) {
    disableSendWithPageButton("新标签页不支持携页面发送");
    return;
  }
  if (isChromeInternalUrl(normalizedUrl)) {
    disableSendWithPageButton("Chrome:// 页面不支持携页面发送");
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
