import type {
  ChunkAnchorCenterPoint,
  ChunkAnchorScrollResult,
} from "./setPageHashTypes.js";
import type { ChunkAnchorWeight } from "../../shared/index.ts";
import { chunkAnchorAttribute } from "../dom/chunkAnchors.js";
import { scrollWindowTo } from "./setPageHashHtmlScroll.js";

const resolveWeightedMedianCenterY = (
  anchors: ChunkAnchorCenterPoint[],
): { weightedMedianCenterY: number; totalWeight: number } => {
  if (!anchors.length) {
    throw new Error("锚点坐标集合为空");
  }
  const sortedAnchors = [...anchors].sort((left, right) => {
      if (left.anchorAbsoluteCenterY !== right.anchorAbsoluteCenterY) {
        return left.anchorAbsoluteCenterY - right.anchorAbsoluteCenterY;
      }
      return right.weight - left.weight;
    }),
    totalWeight = sortedAnchors.reduce((sum, anchor) => sum + anchor.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error("锚点总权重无效");
  }
  const medianThreshold = totalWeight / 2;
  let cumulativeWeight = 0;
  for (const anchor of sortedAnchors) {
    cumulativeWeight += anchor.weight;
    if (cumulativeWeight >= medianThreshold) {
      return {
        totalWeight,
        weightedMedianCenterY: anchor.anchorAbsoluteCenterY,
      };
    }
  }
  const fallbackAnchor = sortedAnchors[sortedAnchors.length - 1];
  return {
    totalWeight,
    weightedMedianCenterY: fallbackAnchor.anchorAbsoluteCenterY,
  };
};

export const scrollHtmlByChunkAnchors = (
  chunkAnchorWeights: ChunkAnchorWeight[],
): ChunkAnchorScrollResult => {
  const anchors: ChunkAnchorCenterPoint[] = [];
  const missingAnchorIds: string[] = [];
  for (const chunkAnchorWeight of chunkAnchorWeights) {
    const anchorSelector = `[${chunkAnchorAttribute}="${chunkAnchorWeight.id}"]`,
      anchor = document.querySelector(anchorSelector);
    if (!anchor) {
      missingAnchorIds.push(chunkAnchorWeight.id);
      continue;
    }
    const rect = anchor.getBoundingClientRect(),
      anchorAbsoluteCenterY = window.scrollY + rect.top + rect.height / 2;
    if (!Number.isFinite(anchorAbsoluteCenterY)) {
      return {
        anchors,
        missingAnchorIds,
        ok: false,
        reason: "chunk_anchor_not_scrollable",
      };
    }
    anchors.push({
      anchorAbsoluteCenterY,
      anchorRectHeight: rect.height,
      anchorRectTop: rect.top,
      anchorSelector,
      id: chunkAnchorWeight.id,
      weight: chunkAnchorWeight.weight,
    });
  }
  if (!anchors.length) {
    return {
      anchors,
      missingAnchorIds,
      ok: false,
      reason: "chunk_anchor_not_found",
    };
  }
  const { weightedMedianCenterY, totalWeight } =
      resolveWeightedMedianCenterY(anchors),
    targetTop = Math.max(0, weightedMedianCenterY - window.innerHeight / 2);
  if (!Number.isFinite(targetTop)) {
    return {
      anchors,
      missingAnchorIds,
      ok: false,
      reason: "chunk_anchor_not_scrollable",
    };
  }
  scrollWindowTo(targetTop);
  return {
    anchors,
    missingAnchorIds,
    ok: true,
    targetTop,
    totalWeight,
    weightedMedianCenterY,
  };
};
