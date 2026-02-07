import type { ChunkAnchorWeight } from "../../shared/index.ts";
import { chunkAnchorAttribute } from "../dom/chunkAnchors.js";
import { scrollWindowTo } from "./setPageHashHtmlScroll.js";
import type {
  ChunkAnchorCenterPoint,
  ChunkAnchorScrollResult,
} from "./setPageHashTypes.js";

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
        weightedMedianCenterY: anchor.anchorAbsoluteCenterY,
        totalWeight,
      };
    }
  }
  const fallbackAnchor = sortedAnchors[sortedAnchors.length - 1];
  return {
    weightedMedianCenterY: fallbackAnchor.anchorAbsoluteCenterY,
    totalWeight,
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
        ok: false,
        reason: "chunk_anchor_not_scrollable",
        anchors,
        missingAnchorIds,
      };
    }
    anchors.push({
      id: chunkAnchorWeight.id,
      weight: chunkAnchorWeight.weight,
      anchorSelector,
      anchorRectTop: rect.top,
      anchorRectHeight: rect.height,
      anchorAbsoluteCenterY,
    });
  }
  if (!anchors.length) {
    return {
      ok: false,
      reason: "chunk_anchor_not_found",
      anchors,
      missingAnchorIds,
    };
  }
  const { weightedMedianCenterY, totalWeight } =
      resolveWeightedMedianCenterY(anchors),
    targetTop = Math.max(0, weightedMedianCenterY - window.innerHeight / 2);
  if (!Number.isFinite(targetTop)) {
    return {
      ok: false,
      reason: "chunk_anchor_not_scrollable",
      anchors,
      missingAnchorIds,
    };
  }
  scrollWindowTo(targetTop);
  return {
    ok: true,
    anchors,
    missingAnchorIds,
    weightedMedianCenterY,
    totalWeight,
    targetTop,
  };
};
