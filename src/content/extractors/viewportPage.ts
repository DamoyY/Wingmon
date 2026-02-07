import type { MarkdownChunkResult } from "../../shared/index.ts";
import type { PrefixTokenCounter } from "./markdownChunking.ts";

const resolveViewportPage = (
  viewportIndex: number,
  chunked: MarkdownChunkResult,
  getPrefixTokenCount: PrefixTokenCounter,
): number => {
  if (!Number.isInteger(viewportIndex) || viewportIndex < 0) {
    throw new Error("视口标记索引无效");
  }
  const markerTokenCount = getPrefixTokenCount(viewportIndex),
    viewportPageRaw =
      chunked.totalTokens > 0
        ? (markerTokenCount / chunked.totalTokens) * chunked.totalPages
        : 1;
  if (!Number.isFinite(viewportPageRaw)) {
    throw new Error("视口页码计算失败");
  }
  return Math.min(chunked.totalPages, Math.max(1, viewportPageRaw));
};

export { resolveViewportPage };
