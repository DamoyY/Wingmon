import {
  extractErrorMessage,
  type SetPageHashRequest,
  type SetPageHashResponse,
} from "../../shared/index.ts";
import { scrollHtmlByChunkAnchors } from "./setPageHashChunkAnchorScroll.js";
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

const warnFallbackToPageRatioScroll = ({
  reason,
  pageNumber,
  totalPages,
  chunkAnchorWeights,
  fallbackMetrics,
  anchorResult,
}: WarnFallbackToPageRatioScrollInput): void => {
  console.warn("chunk anchor 滚动失败，已回退为比例滚动", {
    reason,
    pageNumber,
    totalPages,
    chunkAnchorWeights,
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
          reason: "chunk_anchor_weights_missing",
          pageNumber,
          totalPages,
          chunkAnchorWeights: null,
          fallbackMetrics,
          anchorResult: null,
        });
      } else if (!chunkAnchorWeights.length) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          reason: "chunk_anchor_weights_empty",
          pageNumber,
          totalPages,
          chunkAnchorWeights,
          fallbackMetrics,
          anchorResult: null,
        });
      } else {
        const anchorResult = scrollHtmlByChunkAnchors(chunkAnchorWeights);
        if (!anchorResult.ok) {
          const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
          warnFallbackToPageRatioScroll({
            reason: anchorResult.reason,
            pageNumber,
            totalPages,
            chunkAnchorWeights,
            fallbackMetrics,
            anchorResult,
          });
        }
      }
      return {
        ok: true,
        shouldReload: false,
        pageNumber,
        totalPages,
      };
    }
    window.location.hash = `page=${String(pageNumber)}`;
    return { ok: true, shouldReload: true, pageNumber };
  } catch (error) {
    return createSetPageHashErrorResponse(error);
  }
};

export default setPageHash;
