import {
  type PageNumberInput,
  resolvePageNumberInput,
} from "../common/index.ts";
import {
  type PrefixTokenCounter,
  chunkMarkdownContent,
} from "./markdownChunking.ts";
import type { ChunkAnchorPoint } from "./controlMarkers.ts";
import type { MarkdownChunkResult } from "../../shared/index.ts";
import { resolveViewportPage } from "./viewportPage.ts";

export type MarkdownSegmentationInput = {
  anchors: ChunkAnchorPoint[];
  content: string;
  locateViewportCenter: boolean;
  pageNumber: PageNumberInput;
  viewportIndex: number | null;
};

export type MarkdownSegmentationOutput = {
  anchors: ChunkAnchorPoint[];
  chunked: MarkdownChunkResult;
  prefixTokenCounter: PrefixTokenCounter;
  viewportPage: number;
};

const resolveViewportPageWithoutMarker = (
  pageNumberInput: PageNumberInput,
  totalPages: number,
): number => {
  const pageNumber = resolvePageNumberInput(pageNumberInput);
  const normalizedTotalPages =
    Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  return Math.min(normalizedTotalPages, Math.max(1, pageNumber));
};

const segmentMarkdownStage = (
  input: MarkdownSegmentationInput,
): MarkdownSegmentationOutput => {
  const { chunked, prefixTokenCounter } = chunkMarkdownContent(input.content);
  const viewportPage = (() => {
    if (!input.locateViewportCenter) {
      return resolveViewportPageWithoutMarker(
        input.pageNumber,
        chunked.totalPages,
      );
    }
    if (input.viewportIndex === null) {
      throw new Error("视口中心标记丢失，无法计算分片");
    }
    return resolveViewportPage(
      input.viewportIndex,
      chunked,
      prefixTokenCounter,
    );
  })();
  return { anchors: input.anchors, chunked, prefixTokenCounter, viewportPage };
};

export { segmentMarkdownStage };
