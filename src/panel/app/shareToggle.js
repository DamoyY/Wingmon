import { shareToggle, statusEl } from "../ui/elements.js";
import { setText } from "../ui/text.js";
import { getActiveTab } from "../services/tabs.js";
import { getSettings } from "../services/settings.js";
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
const disableShareToggle = (reason) => {
  shareToggle.checked = false;
  shareToggle.disabled = true;
  shareToggle.title = reason || "当前标签页不支持共享";
};
const enableShareToggle = (settings) => {
  shareToggle.disabled = false;
  shareToggle.title = "";
  shareToggle.checked = settings.sharePage;
};
export const updateShareToggleAvailability = async (settings) => {
  const activeTab = await getActiveTab();
  if (!activeTab.url) {
    throw new Error("活动标签页缺少 URL");
  }
  const normalizedUrl = normalizeUrl(activeTab.url);
  if (isNewTabUrl(normalizedUrl)) {
    disableShareToggle("新标签页不支持共享");
    return;
  }
  if (isChromeInternalUrl(normalizedUrl)) {
    disableShareToggle("Chrome:// 页面不支持共享");
    return;
  }
  const resolvedSettings = settings || (await getSettings());
  enableShareToggle(resolvedSettings);
};
export const refreshShareToggle = async (settings) => {
  try {
    await updateShareToggleAvailability(settings);
  } catch (error) {
    const message = error?.message || "无法读取活动标签页";
    disableShareToggle(message);
    setText(statusEl, message);
  }
};
