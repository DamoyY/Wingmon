import { t } from "../utils/index.ts";
import {
  getSettings,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.js";

type PageReadResultArgs = {
  headerLines: string[];
  contentLabel: string;
  content: string;
  isInternal: boolean;
};

type PageMarkdownData = {
  title: string;
  url: string;
  content: string;
};

type PageContentResponse = {
  title?: string;
  url?: string;
  content?: string;
};

type PageContentMessage = {
  type: "getPageContent";
  pageNumber?: number;
};

const tSafe = t as (key: string) => string,
  sendMessageToTabSafe = sendMessageToTab as (
    tabId: number,
    payload: PageContentMessage,
  ) => Promise<PageContentResponse | null>,
  waitForContentScriptSafe = waitForContentScript as (
    tabId: number,
  ) => Promise<boolean>,
  getSettingsSafe = getSettings as () => Promise<{ followMode?: boolean }>;

const pageContentRetryBaseDelayMs = 200,
  pageContentRetryMaxDelayMs = 2000,
  pageContentRetryTimeoutMs = 10000,
  resolvePageContentRetryDelay = (attempt: number) =>
    Math.min(
      pageContentRetryBaseDelayMs * 2 ** attempt,
      pageContentRetryMaxDelayMs,
    ),
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

export const buildPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  isInternal,
}: PageReadResultArgs): string => {
  const header = headerLines.join("\n");
  if (isInternal) {
    return `${header}\n${tSafe("statusReadFailedInternal")}`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};

const buildPageContentMessage = (pageNumber?: number): PageContentMessage => {
  if (pageNumber !== undefined) {
    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      throw new Error("page_number 必须是正整数");
    }
    return { type: "getPageContent", pageNumber };
  }
  return { type: "getPageContent" };
};

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
): Promise<PageMarkdownData> => {
  const isComplete = await waitForContentScriptSafe(tabId),
    fetchOnce = async () => {
      const pageData = await sendMessageToTabSafe(
        tabId,
        buildPageContentMessage(pageNumber),
      );
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
  const startTime = Date.now(),
    attemptFetch = async (attemptIndex: number) => {
      try {
        return await fetchOnce();
      } catch (error) {
        const failure =
            error instanceof Error ? error : new Error("页面内容获取失败"),
          attemptsMade = attemptIndex + 1,
          elapsedMs = Date.now() - startTime,
          delayMs = resolvePageContentRetryDelay(attemptIndex);
        if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
          console.error("页面内容获取失败，已达到重试上限", failure);
          throw new Error(
            `页面内容获取失败，已重试 ${String(attemptsMade)} 次：${failure.message}`,
          );
        }
        console.error("页面内容获取失败，准备重试", failure);
        await waitForDelay(delayMs);
        return attemptFetch(attemptIndex + 1);
      }
    };
  return attemptFetch(0);
};

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettingsSafe();
  return Boolean(settings.followMode);
};
