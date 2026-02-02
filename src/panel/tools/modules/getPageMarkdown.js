import { isInternalUrl, t } from "../../utils/index.js";
import { focusTab, getAllTabs } from "../../services/index.js";
import { validateTabIdArgs } from "../validation/index.js";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
} from "../pageRead.js";

const parameters = {
  type: "object",
  properties: { tabId: { type: "number" } },
  required: ["tabId"],
  additionalProperties: false,
};

const buildPageMarkdownOutput = ({ title, url, content = "", isInternal }) => {
  const headerLines = isInternal
    ? [t("statusTitleLabel"), title, "**URL：**", url]
    : [t("statusTitleLabel"), title, t("statusUrlLabel"), url];
  return buildPageReadResult({
    headerLines,
    contentLabel: t("statusContentLabel"),
    content,
    isInternal,
  });
};

const execute = async ({ tabId }) => {
  const tabs = await getAllTabs();
  const targetTab = tabs.find((tab) => tab.id === tabId);
  if (!targetTab) {
    throw new Error(`未找到 TabID 为 ${tabId} 的标签页`);
  }
  if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
    throw new Error("标签页缺少 URL");
  }
  if (await shouldFollowMode()) {
    await focusTab(tabId);
  }
  const internalUrl = isInternalUrl(targetTab.url);
  if (internalUrl) {
    const title = targetTab.title || "";
    return buildPageMarkdownOutput({
      title,
      url: targetTab.url,
      isInternal: true,
    });
  }
  const { title, url, content } = await fetchPageMarkdownData(tabId);
  return buildPageMarkdownOutput({
    title,
    url,
    content,
    isInternal: false,
  });
};

export default {
  key: "getPageMarkdown",
  name: "get_page",
  description: t("toolGetPage"),
  parameters,
  validateArgs: validateTabIdArgs,
  execute,
};
