import { isInternalUrl, t } from "../../utils/index.js";
import { createTab, focusTab, getAllTabs } from "../../services/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs } from "./utils.js";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
} from "../pageRead.js";

const parameters = {
  type: "object",
  properties: {
    url: { type: "string" },
    focus: { type: "boolean", description: t("toolParamFocus") },
  },
  required: ["url", "focus"],
  additionalProperties: false,
};

const buildOpenPageAlreadyExistsOutput = (tabId) =>
  t("statusAlreadyExists", [String(tabId)]);

const buildOpenPageReadOutput = ({ title, tabId, content = "", isInternal }) =>
  buildPageReadResult({
    headerLines: [
      t("statusOpenSuccess"),
      `${t("statusTitle")}: "${title}"`,
      `${t("statusTabId")}: "${tabId}"`,
    ],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal,
  });

const normalizeTab = (tab) => {
  if (typeof tab.url !== "string" || !tab.url.trim()) {
    console.error("标签页缺少 URL", tab);
    return null;
  }
  try {
    return { ...tab, normalizedUrl: new URL(tab.url).toString() };
  } catch (error) {
    console.error("标签页 URL 解析失败", tab, error);
    return null;
  }
};

const validateArgs = (args) => {
  ensureObjectArgs(args);
  if (typeof args.url !== "string" || !args.url.trim()) {
    throw new ToolInputError("url 必须是非空字符串");
  }
  if (typeof args.focus !== "boolean") {
    throw new ToolInputError("focus 必须是布尔值");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch (error) {
    throw new ToolInputError("url 格式不正确");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new ToolInputError("url 仅支持 http 或 https");
  }
  return { url: parsedUrl.toString(), focus: args.focus };
};

const execute = async ({ url, focus }) => {
  const followMode = await shouldFollowMode();
  const shouldFocus = followMode || focus;
  const tabs = await getAllTabs();
  const normalizedTabs = tabs.map(normalizeTab).filter(Boolean);
  const matchedTab = normalizedTabs.find((tab) => tab.normalizedUrl === url);
  if (matchedTab) {
    if (typeof matchedTab.id !== "number") {
      throw new Error("标签页缺少 TabID");
    }
    if (shouldFocus) {
      await focusTab(matchedTab.id);
    }
    return buildOpenPageAlreadyExistsOutput(matchedTab.id);
  }
  const tab = await createTab(url, shouldFocus);
  if (shouldFocus) {
    await focusTab(tab.id);
  }
  const initialInternal = isInternalUrl(url);
  if (initialInternal) {
    const title = tab.title || "";
    return buildOpenPageReadOutput({
      title,
      tabId: tab.id,
      isInternal: true,
    });
  }
  const { title, url: pageUrl, content } = await fetchPageMarkdownData(tab.id);
  return buildOpenPageReadOutput({
    title,
    tabId: tab.id,
    content,
    isInternal: isInternalUrl(pageUrl || url),
  });
};

export default {
  key: "openBrowserPage",
  name: "open_page",
  description: t("toolOpenPage"),
  parameters,
  validateArgs,
  execute,
};
