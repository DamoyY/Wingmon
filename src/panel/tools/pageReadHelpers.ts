import { t } from "../utils/index.ts";
import { tryParsePositiveNumber } from "../../shared/index.ts";
import {
  getSettings,
  reloadTab,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.ts";
import { parseOptionalPositiveInteger } from "./validation/index.js";

type PageReadResultArgs = {
  headerLines: string[];
  contentLabel: string;
  content: string;
  isInternal: boolean;
};

export type PageReadMetadata = {
  pageNumber: number;
  totalPages: number;
  viewportPage: number;
  chunkAnchorId?: string;
};

export type PageMarkdownData = PageReadMetadata & {
  title: string;
  url: string;
  content: string;
};

type PageContentResponse = {
  title?: string;
  url?: string;
  content?: string;
  pageNumber?: number | string;
  totalPages?: number | string;
  viewportPage?: number | string;
  chunkAnchorId?: string;
};

type PageContentMessage = {
  type: "getPageContent";
  pageNumber?: number;
};

type PageHashMessage = {
  type: "setPageHash";
  pageNumber: number;
  totalPages: number;
  viewportPage: number;
  chunkAnchorId?: string;
};

type PageHashResponse = {
  ok?: boolean;
  skipped?: boolean;
  reload?: boolean;
  shouldReload?: boolean;
};

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

const parsePositiveNumber = (
    value: unknown,
    fieldName: string,
  ): number | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    const parsedValue = tryParsePositiveNumber(value);
    if (parsedValue !== null) {
      return parsedValue;
    }
    throw new Error(`${fieldName} 必须是正数`);
  },
  parseNonEmptyString = (
    value: unknown,
    fieldName: string,
  ): string | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    throw new Error(`${fieldName} 必须是非空字符串`);
  },
  resolvePageNumber = (value?: number): number =>
    parseOptionalPositiveInteger(value, "page_number") ?? 1,
  resolvePageMetadata = (
    meta: {
      pageNumber?: unknown;
      totalPages?: unknown;
      viewportPage?: unknown;
      chunkAnchorId?: unknown;
    },
    fallbackPageNumber?: number,
  ): PageReadMetadata => {
    const pageNumber =
        parseOptionalPositiveInteger(meta.pageNumber, "pageNumber") ??
        resolvePageNumber(fallbackPageNumber),
      totalPages =
        parseOptionalPositiveInteger(meta.totalPages, "totalPages") ??
        pageNumber,
      viewportPage =
        parsePositiveNumber(meta.viewportPage, "viewportPage") ?? pageNumber;
    const chunkAnchorId = parseNonEmptyString(
      meta.chunkAnchorId,
      "chunkAnchorId",
    );
    if (pageNumber > totalPages) {
      throw new Error(
        `pageNumber 超出范围：${String(pageNumber)} > ${String(totalPages)}`,
      );
    }
    if (viewportPage > totalPages) {
      throw new Error(
        `viewportPage 超出范围：${String(viewportPage)} > ${String(totalPages)}`,
      );
    }
    return {
      pageNumber,
      totalPages,
      viewportPage,
      chunkAnchorId,
    };
  };

export const buildPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  isInternal,
}: PageReadResultArgs): string => {
  const header = headerLines.join("\n");
  if (isInternal) {
    return `${header}\n${t("statusReadFailedInternal")}`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};

const buildPageContentMessage = (pageNumber?: number): PageContentMessage => {
  if (pageNumber !== undefined) {
    return {
      type: "getPageContent",
      pageNumber: resolvePageNumber(pageNumber),
    };
  }
  return { type: "getPageContent" };
};

const buildPageHashMessage = (pageData?: {
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
  chunkAnchorId?: string;
}): PageHashMessage => ({
  type: "setPageHash",
  ...resolvePageMetadata(pageData ?? {}),
});

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
): Promise<PageMarkdownData> => {
  const isComplete = await waitForContentScript(tabId),
    fetchOnce = async () => {
      const pageData = await sendMessageToTab<PageContentResponse>(
        tabId,
        buildPageContentMessage(pageNumber),
      );
      if (typeof pageData.content !== "string") {
        throw new Error("页面内容为空");
      }
      const metadata = resolvePageMetadata(pageData, pageNumber);
      return {
        title: pageData.title || "",
        url: pageData.url || "",
        content: pageData.content,
        ...metadata,
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

export const syncPageHash = async (
  tabId: number,
  pageData?: {
    pageNumber?: number;
    totalPages?: number;
    viewportPage?: number;
    chunkAnchorId?: string;
  },
): Promise<void> => {
  await waitForContentScript(tabId);
  const response = await sendMessageToTab<PageHashResponse>(
    tabId,
    buildPageHashMessage(pageData),
  );
  if (!response.ok || response.skipped) {
    return;
  }
  const shouldReload =
    typeof response.shouldReload === "boolean"
      ? response.shouldReload
      : typeof response.reload === "boolean"
        ? response.reload
        : false;
  if (!shouldReload) {
    return;
  }
  await reloadTab(tabId);
};

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings.followMode;
};
