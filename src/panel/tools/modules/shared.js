import { t } from "../../utils/index.js";
import ToolInputError from "../errors.js";
import {
  getSettings,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.js";

export const ensureObjectArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new ToolInputError("工具参数必须是对象");
  }
};

export const validateTabIdArgs = (args) => {
  ensureObjectArgs(args);
  const raw = args.tabId;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return { tabId: raw };
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ToolInputError("tabId 必须是正整数");
    }
    return { tabId: parsed };
  }
  throw new ToolInputError("tabId 必须是正整数");
};

export const buildPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  isInternal,
}) => {
  const header = headerLines.join("\n");
  if (isInternal) {
    return `${header}\n${t("statusReadFailedInternal")}`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};

export const fetchPageMarkdownData = async (tabId) => {
  await waitForContentScript(tabId);
  const pageData = await sendMessageToTab(tabId, { type: "getPageContent" });
  if (!pageData || typeof pageData.content !== "string") {
    throw new Error("页面内容为空");
  }
  return {
    title: pageData.title || "",
    url: pageData.url || "",
    content: pageData.content,
  };
};

export const shouldFollowMode = async () => {
  const settings = await getSettings();
  return Boolean(settings.followMode);
};
