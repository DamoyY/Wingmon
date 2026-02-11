import {
  type SetPageHashRequest,
  type SetPageHashResponse,
  extractErrorMessage,
} from "../../shared/index.ts";
import {
  isHtmlDocument,
  resolveHtmlTotalPages,
  scrollHtmlByPage,
} from "./setPageHashHtmlScroll.js";
import {
  resolveSetPageHashChunkAnchorWeights,
  resolveSetPageHashPageNumber,
  resolveSetPageHashTotalPages,
} from "./setPageHashMessageResolver.js";
import type { WarnFallbackToPageRatioScrollInput } from "./setPageHashTypes.js";
import { scrollHtmlByChunkAnchors } from "./setPageHashChunkAnchorScroll.js";

const warnFallbackToPageRatioScroll = ({
  reason,
  pageNumber,
  totalPages,
  chunkAnchorWeights,
  fallbackMetrics,
  anchorResult,
}: WarnFallbackToPageRatioScrollInput): void => {
  console.warn("chunk anchor 滚动失败，已回退为比例滚动", {
    anchor: anchorResult,
    chunkAnchorWeights,
    fallback: fallbackMetrics,
    pageNumber,
    reason,
    title: document.title || "",
    totalPages,
    url: window.location.href || "",
    viewport: {
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      scrollYBeforeFallback: window.scrollY,
    },
  });
};

const createSetPageHashErrorResponse = (
  error: unknown,
): SetPageHashResponse => {
  const message = extractErrorMessage(error, { fallback: "页面跳转失败" });
  console.error(message);
  return { error: message };
};

const setPageHash = (message: SetPageHashRequest): SetPageHashResponse => {
  try {
    const pageNumber = resolveSetPageHashPageNumber(message),
      chunkAnchorWeights = resolveSetPageHashChunkAnchorWeights(message);
    if (isHtmlDocument()) {
      const providedTotalPages = resolveSetPageHashTotalPages(message),
        totalPages = providedTotalPages ?? resolveHtmlTotalPages();
      if (!chunkAnchorWeights) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          anchorResult: null,
          chunkAnchorWeights: null,
          fallbackMetrics,
          pageNumber,
          reason: "chunk_anchor_weights_missing",
          totalPages,
        });
      } else if (!chunkAnchorWeights.length) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          anchorResult: null,
          chunkAnchorWeights,
          fallbackMetrics,
          pageNumber,
          reason: "chunk_anchor_weights_empty",
          totalPages,
        });
      } else {
        const anchorResult = scrollHtmlByChunkAnchors(chunkAnchorWeights);
        if (!anchorResult.ok) {
          const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
          warnFallbackToPageRatioScroll({
            anchorResult,
            chunkAnchorWeights,
            fallbackMetrics,
            pageNumber,
            reason: anchorResult.reason,
            totalPages,
          });
        }
      }
      return {
        ok: true,
        pageNumber,
        shouldReload: false,
        skipped: false,
        totalPages,
      };
    }
    window.location.hash = `page=${String(pageNumber)}`;
    return { ok: true, pageNumber, shouldReload: true, skipped: false };
  } catch (error) {
    return createSetPageHashErrorResponse(error);
  }
};

export default setPageHash;
