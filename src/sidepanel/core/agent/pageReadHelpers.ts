import {
  type ChunkAnchorWeight,
  type GetPageContentRequest,
  type GetPageContentSuccessResponse,
  type SetPageHashRequest,
} from "../../../shared/index.ts";
import {
  getSettings,
  getTabNavigationFailure,
  reloadTab,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.ts";
import { parseOptionalPositiveInteger } from "./validation/index.js";
import { t } from "../../lib/utils/index.ts";

type PageReadResultArgs = {
  content: string;
  contentLabel: string;
  headerLines: string[];
  isInternal: boolean;
};

export type PageReadMetadata = {
  chunkAnchorWeights?: ChunkAnchorWeight[];
  pageNumber: number;
  totalPages: number;
  viewportPage: number;
};

export type PageMarkdownData = PageReadMetadata & {
  content: string;
  title: string;
  url: string;
};

type FetchPageMarkdownDataOptions = {
  locateViewportCenter?: boolean;
};

type PageReadMetadataInput = {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
};

const pageContentRetryBaseDelayMs = 200,
  contentScriptMissingReceiverPattern = /Receiving end does not exist/u,
  pageContentRetryTimeoutMs = 10000,
  chunkAnchorIdPattern = /^[a-z0-9]+$/u,
  resolvePageContentRetryDelay = (attempt: number) =>
    pageContentRetryBaseDelayMs * 2 ** attempt,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const parseChunkAnchorWeightItem = (
    item: ChunkAnchorWeight,
    fieldName: string,
    index: number,
  ): ChunkAnchorWeight => {
    if (typeof item.id !== "string") {
      throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
    }
    const id = item.id.trim().toLowerCase();
    if (!id || !chunkAnchorIdPattern.test(id)) {
      throw new Error(
        `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
      );
    }
    const weight = parseOptionalPositiveInteger(
      item.weight,
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
    value: readonly ChunkAnchorWeight[] | undefined,
    fieldName: string,
  ): ChunkAnchorWeight[] | undefined => {
    if (value === undefined) {
      return undefined;
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
  normalizePageReadFailure = (error: unknown): Error => {
    if (error instanceof Error) {
      return error;
    }
    return new Error("页面内容获取失败");
  },
  resolvePageNumber = (value?: number): number =>
    parseOptionalPositiveInteger(value, "pageNumber") ?? 1,
  resolvePageMetadata = (
    meta: PageReadMetadataInput,
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
        parseOptionalPositiveInteger(meta.viewportPage, "viewportPage") ??
          pageNumber,
        "viewportPage",
        totalPages,
      ),
      chunkAnchorWeights = parseOptionalChunkAnchorWeights(
        meta.chunkAnchorWeights,
        "chunkAnchorWeights",
      );
    return {
      chunkAnchorWeights,
      pageNumber,
      totalPages,
      viewportPage,
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
  pageNumber: number | undefined,
  options: FetchPageMarkdownDataOptions,
): GetPageContentRequest => {
  const message: GetPageContentRequest = { type: "getPageContent" };
  if (pageNumber !== undefined) {
    message.pageNumber = resolvePageNumber(pageNumber);
  }
  if (options.locateViewportCenter === true) {
    message.locateViewportCenter = true;
  }
  return message;
};

const buildPageHashMessage = (pageData?: {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
}): SetPageHashRequest => {
  const metadata = resolvePageMetadata(pageData ?? {});
  return {
    chunkAnchorWeights: metadata.chunkAnchorWeights,
    pageNumber: metadata.pageNumber,
    totalPages: metadata.totalPages,
    type: "setPageHash",
  };
};

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
  options: FetchPageMarkdownDataOptions = {},
): Promise<PageMarkdownData> => {
  const shouldRetry = await waitForContentScript(tabId),
    fetchOnce = async () => {
      const pageData: GetPageContentSuccessResponse = await sendMessageToTab(
        tabId,
        buildPageContentMessage(pageNumber, options),
      );
      const metadata = resolvePageMetadata(pageData, pageNumber);
      return {
        content: pageData.content,
        title: pageData.title,
        url: pageData.url,
        ...metadata,
      };
    },
    startTime = Date.now();
  let attemptIndex = 0;
  for (;;) {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure = normalizePageReadFailure(error),
        navigationFailure = getTabNavigationFailure(tabId),
        shouldReplaceWithNavigationFailure =
          navigationFailure !== null &&
          contentScriptMissingReceiverPattern.test(failure.message);
      if (shouldReplaceWithNavigationFailure) {
        const normalizedFailure = new Error(navigationFailure.error);
        console.error(
          `页面内容获取失败：${normalizedFailure.message}`,
          normalizedFailure,
          navigationFailure,
        );
        throw normalizedFailure;
      }
      const failureMessage = `页面内容获取失败：${failure.message}`;
      if (!shouldRetry) {
        console.error(failureMessage, failure);
        throw failure;
      }
      const elapsedMs = Date.now() - startTime,
        delayMs = resolvePageContentRetryDelay(attemptIndex),
        attemptsMade = attemptIndex + 1,
        retryWarningMessage = `第${String(attemptsMade)}次获取页面内容获取失败：${failure.message}`;
      console.warn(retryWarningMessage, failure);
      if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
        console.warn(failureMessage, failure);
        throw failure;
      }
      await waitForDelay(delayMs);
      attemptIndex += 1;
    }
  }
};

export const syncPageHash = async (
  tabId: number,
  pageData?: {
    chunkAnchorWeights?: ChunkAnchorWeight[];
    pageNumber?: number;
    totalPages?: number;
    viewportPage?: number;
  },
): Promise<void> => {
  await waitForContentScript(tabId);
  const response = await sendMessageToTab(
    tabId,
    buildPageHashMessage(pageData),
  );
  if (response.skipped) {
    return;
  }
  if (!response.shouldReload) {
    return;
  }
  await reloadTab(tabId);
};

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings.followMode;
};
