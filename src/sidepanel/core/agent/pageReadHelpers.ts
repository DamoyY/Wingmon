import { t } from "../../lib/utils/index.ts";
import {
  type ChunkAnchorWeight,
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
  chunkAnchorWeights?: ChunkAnchorWeight[];
};

export type PageMarkdownData = PageReadMetadata & {
  title: string;
  url: string;
  content: string;
};

const pageContentRetryBaseDelayMs = 200,
  pageContentRetryMaxDelayMs = 2000,
  pageContentRetryTimeoutMs = 10000,
  chunkAnchorIdPattern = /^[a-z0-9]+$/i,
  resolvePageContentRetryDelay = (attempt: number) =>
    Math.min(
      pageContentRetryBaseDelayMs * 2 ** attempt,
      pageContentRetryMaxDelayMs,
    ),
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const parseChunkAnchorWeightItem = (
    item: unknown,
    fieldName: string,
    index: number,
  ): ChunkAnchorWeight => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`${fieldName}[${String(index)}] 必须是对象`);
    }
    const chunkAnchorWeight = item as {
      id?: unknown;
      weight?: unknown;
    } | null;
    if (!chunkAnchorWeight || typeof chunkAnchorWeight.id !== "string") {
      throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
    }
    const id = chunkAnchorWeight.id.trim().toLowerCase();
    if (!id || !chunkAnchorIdPattern.test(id)) {
      throw new Error(
        `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
      );
    }
    const weight = parseOptionalPositiveInteger(
      chunkAnchorWeight.weight,
      `${fieldName}[${String(index)}].weight`,
    );
    if (weight === undefined) {
      throw new Error(`${fieldName}[${String(index)}].weight 必须是正整数`);
    }
    return {
      id,
      weight,
    };
  },
  parseOptionalChunkAnchorWeights = (
    value: unknown,
    fieldName: string,
  ): ChunkAnchorWeight[] | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName} 必须是数组`);
    }
    const usedIds = new Set<string>();
    const chunkAnchorWeights = value.map((item, index) =>
      parseChunkAnchorWeightItem(item, fieldName, index),
    );
    chunkAnchorWeights.forEach((chunkAnchorWeight) => {
      if (usedIds.has(chunkAnchorWeight.id)) {
        throw new Error(`${fieldName} 存在重复 id：${chunkAnchorWeight.id}`);
      }
      usedIds.add(chunkAnchorWeight.id);
    });
    return chunkAnchorWeights;
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
      chunkAnchorWeights?: unknown;
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
      chunkAnchorWeights = parseOptionalChunkAnchorWeights(
        meta.chunkAnchorWeights,
        "chunkAnchorWeights",
      );
    return {
      pageNumber,
      totalPages,
      viewportPage,
      chunkAnchorWeights,
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
  chunkAnchorWeights?: ChunkAnchorWeight[];
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
    chunkAnchorWeights?: ChunkAnchorWeight[];
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
