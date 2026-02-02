import { t } from "../utils/index.js";
import {
  getSettings,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.js";

const pageContentRetryBaseDelayMs = 200;
const pageContentRetryMaxDelayMs = 2000;
const pageContentRetryTimeoutMs = 10000;

const resolvePageContentRetryDelay = (attempt) =>
  Math.min(
    pageContentRetryBaseDelayMs * 2 ** attempt,
    pageContentRetryMaxDelayMs,
  );

const waitForDelay = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

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
  const isComplete = await waitForContentScript(tabId);
  const fetchOnce = async () => {
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
  if (!isComplete) {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("页面内容获取失败");
      console.error("页面内容获取失败", failure);
      throw failure;
    }
  }
  const startTime = Date.now();
  const attemptFetch = async (attemptIndex) => {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("页面内容获取失败");
      const attemptsMade = attemptIndex + 1;
      const elapsedMs = Date.now() - startTime;
      const delayMs = resolvePageContentRetryDelay(attemptIndex);
      if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
        console.error("页面内容获取失败，已达到重试上限", failure);
        throw new Error(
          `页面内容获取失败，已重试 ${attemptsMade} 次：${failure.message}`,
        );
      }
      console.error("页面内容获取失败，准备重试", failure);
      await waitForDelay(delayMs);
      return attemptFetch(attemptIndex + 1);
    }
  };
  return attemptFetch(0);
};

export const shouldFollowMode = async () => {
  const settings = await getSettings();
  return Boolean(settings.followMode);
};
