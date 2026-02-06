import { t } from "../../lib/utils/index.ts";
import {
  type GetPageContentRequest,
  type GetPageContentResponse,
  type SetPageHashRequest,
} from "../../../shared/index.ts";
import {
  getSettings,
  reloadTab,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.ts";
import {
  parseOptionalPositiveInteger,
  parseOptionalPositiveNumber,
} from "./validation/index.js";

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

const parseOptionalTrimmedString = (
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
  ensurePageInRange = (
    value: number,
    fieldName: string,
    totalPages: number,
  ): number => {
    if (value > totalPages) {
      throw new Error(
        `${fieldName} 超出范围：${String(value)} > ${String(totalPages)}`,
      );
    }
    return value;
  },
  resolveBooleanFlag = (...values: unknown[]): boolean => {
    for (const value of values) {
      if (typeof value === "boolean") {
        return value;
      }
    }
    return false;
  },
  normalizePageReadFailure = (error: unknown): Error => {
    if (error instanceof Error) {
      return error;
    }
    return new Error("页面内容获取失败");
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
    const normalizedPageNumber =
        parseOptionalPositiveInteger(meta.pageNumber, "pageNumber") ??
        resolvePageNumber(fallbackPageNumber),
      totalPages =
        parseOptionalPositiveInteger(meta.totalPages, "totalPages") ??
        normalizedPageNumber,
      pageNumber = ensurePageInRange(
        normalizedPageNumber,
        "pageNumber",
        totalPages,
      ),
      viewportPage = ensurePageInRange(
        parseOptionalPositiveNumber(meta.viewportPage, "viewportPage") ??
          pageNumber,
        "viewportPage",
        totalPages,
      ),
      chunkAnchorId = parseOptionalTrimmedString(
        meta.chunkAnchorId,
        "chunkAnchorId",
      );
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

const buildPageContentMessage = (
  pageNumber?: number,
): GetPageContentRequest => {
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
}): SetPageHashRequest => ({
  type: "setPageHash",
  ...resolvePageMetadata(pageData ?? {}),
});

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
): Promise<PageMarkdownData> => {
  const shouldRetry = await waitForContentScript(tabId),
    fetchOnce = async () => {
      const pageData: GetPageContentResponse = await sendMessageToTab(
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
    },
    startTime = Date.now();
  let attemptIndex = 0;
  for (;;) {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure = normalizePageReadFailure(error);
      if (!shouldRetry) {
        console.error("页面内容获取失败", failure);
        throw failure;
      }
      const elapsedMs = Date.now() - startTime,
        delayMs = resolvePageContentRetryDelay(attemptIndex),
        attemptsMade = attemptIndex + 1;
      if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
        console.error("页面内容获取失败，已达到重试上限", failure);
        throw new Error(
          `页面内容获取失败，已重试 ${String(attemptsMade)} 次：${failure.message}`,
        );
      }
      console.error("页面内容获取失败，准备重试", failure);
      await waitForDelay(delayMs);
      attemptIndex += 1;
    }
  }
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
  const response = await sendMessageToTab(
    tabId,
    buildPageHashMessage(pageData),
  );
  if (!response.ok || response.skipped) {
    return;
  }
  const shouldReload = resolveBooleanFlag(
    response.shouldReload,
    response.reload,
  );
  if (!shouldReload) {
    return;
  }
  await reloadTab(tabId);
};

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings.followMode;
};
