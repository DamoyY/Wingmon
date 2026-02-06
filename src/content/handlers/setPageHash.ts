import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import { chunkAnchorAttribute } from "../dom/chunkAnchors.js";
import convertPageContentToMarkdown from "../markdown/converter.js";

type PageNumberInput = number | string | null;
type ChunkAnchorInput = string | null;

type SetPageHashMessage = {
  pageNumber?: PageNumberInput;
  page_number?: PageNumberInput;
  totalPages?: PageNumberInput;
  total_pages?: PageNumberInput;
  chunkAnchorId?: ChunkAnchorInput;
  chunk_anchor_id?: ChunkAnchorInput;
};

type SetPageHashResponse = {
  ok?: boolean;
  skipped?: boolean;
  shouldReload?: boolean;
  pageNumber?: number;
  totalPages?: number;
  error?: string;
};

type SendResponse = (response: SetPageHashResponse) => void;

type ChunkAnchorScrollResult =
  | {
      ok: true;
      anchorSelector: string;
      anchorAbsoluteTop: number;
      anchorRectTop: number;
      anchorRectHeight: number;
      targetTop: number;
    }
  | {
      ok: false;
      reason: "chunk_anchor_not_found" | "chunk_anchor_not_scrollable";
      anchorSelector: string;
    };

type HtmlFallbackScrollMetrics = {
  ratio: number;
  maxScrollTop: number;
  targetTop: number;
  documentHeight: number;
  bodyHeight: number;
};

const resolvePageNumber = (value: PageNumberInput): number => {
  if (value === null) {
    return 1;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error("page_number 必须是正整数");
};

const resolveMessagePageNumber = (message: SetPageHashMessage): number => {
  const hasCamel = "pageNumber" in message,
    hasSnake = "page_number" in message;
  if (hasCamel && hasSnake) {
    const camelValue = resolvePageNumber(message.pageNumber ?? null),
      snakeValue = resolvePageNumber(message.page_number ?? null);
    if (camelValue !== snakeValue) {
      throw new Error("pageNumber 与 page_number 不一致");
    }
    return camelValue;
  }
  if (hasCamel) {
    return resolvePageNumber(message.pageNumber ?? null);
  }
  if (hasSnake) {
    return resolvePageNumber(message.page_number ?? null);
  }
  return 1;
};

const resolveMessageTotalPages = (
  message: SetPageHashMessage,
): number | null => {
  const hasCamel = "totalPages" in message,
    hasSnake = "total_pages" in message;
  if (!hasCamel && !hasSnake) {
    return null;
  }
  if (hasCamel && hasSnake) {
    const camelValue = resolvePageNumber(message.totalPages ?? null),
      snakeValue = resolvePageNumber(message.total_pages ?? null);
    if (camelValue !== snakeValue) {
      throw new Error("totalPages 与 total_pages 不一致");
    }
    return camelValue;
  }
  return resolvePageNumber(
    hasCamel ? (message.totalPages ?? null) : (message.total_pages ?? null),
  );
};

const resolveChunkAnchorId = (value: ChunkAnchorInput): string | null => {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && /^[a-z0-9]+$/i.test(value)) {
    return value;
  }
  throw new Error("chunk_anchor_id 必须是非空字母数字字符串");
};

const resolveMessageChunkAnchorId = (
  message: SetPageHashMessage,
): string | null => {
  const hasCamel = "chunkAnchorId" in message,
    hasSnake = "chunk_anchor_id" in message;
  if (hasCamel && hasSnake) {
    const camelValue = resolveChunkAnchorId(message.chunkAnchorId ?? null),
      snakeValue = resolveChunkAnchorId(message.chunk_anchor_id ?? null);
    if (camelValue !== snakeValue) {
      throw new Error("chunkAnchorId 与 chunk_anchor_id 不一致");
    }
    return camelValue;
  }
  if (hasCamel) {
    return resolveChunkAnchorId(message.chunkAnchorId ?? null);
  }
  if (hasSnake) {
    return resolveChunkAnchorId(message.chunk_anchor_id ?? null);
  }
  return null;
};

const resolveHtmlFallbackScrollMetrics = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  if (pageNumber > totalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(totalPages)}`,
    );
  }
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  const ratio = (pageNumber - 0.5) / totalPages,
    documentHeight = document.documentElement.scrollHeight,
    bodyHeight = body.scrollHeight,
    maxScrollTop = Math.max(documentHeight, bodyHeight) - window.innerHeight,
    targetTop = Math.max(0, maxScrollTop) * ratio;
  return {
    ratio,
    maxScrollTop,
    targetTop,
    documentHeight,
    bodyHeight,
  };
};

const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolveHtmlTotalPages = (): number => {
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  let marker: HTMLSpanElement | null = null;
  try {
    marker = insertViewportMarker(body);
    assignLlmIds(body);
    const markdown = convertPageContentToMarkdown({
      body,
      title: document.title || "",
      url: window.location.href || "",
      pageNumber: 1,
    });
    return markdown.totalPages;
  } finally {
    if (marker?.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};

const scrollHtmlByPage = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  const metrics = resolveHtmlFallbackScrollMetrics(pageNumber, totalPages);
  window.scrollTo({
    top: metrics.targetTop,
    behavior: "auto",
  });
  return metrics;
};

const scrollHtmlByChunkAnchor = (anchorId: string): ChunkAnchorScrollResult => {
  const anchorSelector = `[${chunkAnchorAttribute}="${anchorId}"]`,
    anchor = document.querySelector(anchorSelector);
  if (!anchor) {
    return {
      ok: false,
      reason: "chunk_anchor_not_found",
      anchorSelector,
    };
  }
  const rect = anchor.getBoundingClientRect(),
    absoluteTop = window.scrollY + rect.top,
    centerOffset = window.innerHeight / 2 - rect.height / 2,
    targetTop = Math.max(0, absoluteTop - centerOffset);
  if (!Number.isFinite(targetTop)) {
    return {
      ok: false,
      reason: "chunk_anchor_not_scrollable",
      anchorSelector,
    };
  }
  window.scrollTo({
    top: targetTop,
    behavior: "auto",
  });
  return {
    ok: true,
    anchorSelector,
    anchorAbsoluteTop: absoluteTop,
    anchorRectTop: rect.top,
    anchorRectHeight: rect.height,
    targetTop,
  };
};

const warnFallbackToPageRatioScroll = ({
  reason,
  pageNumber,
  totalPages,
  chunkAnchorId,
  fallbackMetrics,
  anchorResult,
}: {
  reason: string;
  pageNumber: number;
  totalPages: number;
  chunkAnchorId: string | null;
  fallbackMetrics: HtmlFallbackScrollMetrics;
  anchorResult: ChunkAnchorScrollResult | null;
}): void => {
  console.warn("chunk anchor 滚动失败，已回退为比例滚动", {
    reason,
    pageNumber,
    totalPages,
    chunkAnchorId,
    url: window.location.href || "",
    title: document.title || "",
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollYBeforeFallback: window.scrollY,
    },
    fallback: fallbackMetrics,
    anchor: anchorResult,
  });
};

const handleSetPageHash = (
  message: SetPageHashMessage,
  sendResponse: SendResponse,
): void => {
  try {
    const pageNumber = resolveMessagePageNumber(message),
      chunkAnchorId = resolveMessageChunkAnchorId(message);
    if (isHtmlDocument()) {
      const providedTotalPages = resolveMessageTotalPages(message);
      if (pageNumber === 1) {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
        sendResponse({
          ok: true,
          shouldReload: false,
          pageNumber,
          ...(providedTotalPages === null
            ? {}
            : { totalPages: providedTotalPages }),
        });
        return;
      }
      const totalPages = providedTotalPages ?? resolveHtmlTotalPages();
      if (!chunkAnchorId) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          reason: "chunk_anchor_id_missing",
          pageNumber,
          totalPages,
          chunkAnchorId: null,
          fallbackMetrics,
          anchorResult: null,
        });
      } else {
        const anchorResult = scrollHtmlByChunkAnchor(chunkAnchorId);
        if (!anchorResult.ok) {
          const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
          warnFallbackToPageRatioScroll({
            reason: anchorResult.reason,
            pageNumber,
            totalPages,
            chunkAnchorId,
            fallbackMetrics,
            anchorResult,
          });
        }
      }
      sendResponse({
        ok: true,
        shouldReload: false,
        pageNumber,
        totalPages,
      });
      return;
    }
    window.location.hash = `page=${String(pageNumber)}`;
    sendResponse({ ok: true, shouldReload: true, pageNumber });
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面跳转失败",
    );
  }
};

export default handleSetPageHash;
