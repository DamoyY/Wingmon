import type { ChunkAnchorWeight } from "../../shared/index.ts";

export type ChunkAnchorCenterPoint = {
  id: string;
  weight: number;
  anchorSelector: string;
  anchorRectTop: number;
  anchorRectHeight: number;
  anchorAbsoluteCenterY: number;
};

export type ChunkAnchorScrollResult =
  | {
      ok: true;
      anchors: ChunkAnchorCenterPoint[];
      missingAnchorIds: string[];
      weightedMedianCenterY: number;
      totalWeight: number;
      targetTop: number;
    }
  | {
      ok: false;
      reason: "chunk_anchor_not_found" | "chunk_anchor_not_scrollable";
      anchors: ChunkAnchorCenterPoint[];
      missingAnchorIds: string[];
    };

export type HtmlFallbackScrollMetrics = {
  ratio: number;
  maxScrollTop: number;
  targetTop: number;
  documentHeight: number;
  bodyHeight: number;
};

export type WarnFallbackToPageRatioScrollInput = {
  reason: string;
  pageNumber: number;
  totalPages: number;
  chunkAnchorWeights: ChunkAnchorWeight[] | null;
  fallbackMetrics: HtmlFallbackScrollMetrics;
  anchorResult: ChunkAnchorScrollResult | null;
};
