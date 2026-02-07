import type { ChunkAnchorWeight } from "../../shared/index.ts";
import type { ChunkAnchorPoint } from "./controlMarkers.ts";
import type { PrefixTokenCounter } from "./markdownChunking.ts";

const MINIMUM_CHUNK_ANCHOR_WEIGHT = 1;

const resolveChunkAnchorWeights = (
  anchors: ChunkAnchorPoint[],
  boundaries: number[],
  pageNumber: number,
  getPrefixTokenCount: PrefixTokenCounter,
): ChunkAnchorWeight[] => {
  if (!anchors.length) {
    return [];
  }
  const chunkStartRaw = boundaries[pageNumber - 1],
    chunkEndRaw = boundaries[pageNumber];
  if (!Number.isInteger(chunkStartRaw) || !Number.isInteger(chunkEndRaw)) {
    throw new Error("分片边界无效");
  }
  const chunkStart = chunkStartRaw,
    chunkEnd = chunkEndRaw,
    anchorsInChunk = anchors.filter(
      (anchor) => anchor.index >= chunkStart && anchor.index <= chunkEnd,
    );
  if (!anchorsInChunk.length) {
    return [];
  }
  const chunkStartTokens = getPrefixTokenCount(chunkStart),
    chunkEndTokens = getPrefixTokenCount(chunkEnd),
    chunkTokenSpan = chunkEndTokens - chunkStartTokens;
  if (!Number.isInteger(chunkTokenSpan) || chunkTokenSpan < 0) {
    throw new Error("分片 token 范围无效");
  }
  const chunkCenterTokens = (chunkStartTokens + chunkEndTokens) / 2,
    chunkRadiusTokens = Math.max(
      MINIMUM_CHUNK_ANCHOR_WEIGHT,
      Math.ceil(chunkTokenSpan / 2),
    );
  return anchorsInChunk
    .map((anchor) => {
      const anchorTokenIndex = getPrefixTokenCount(anchor.index),
        distanceTokens = Math.abs(anchorTokenIndex - chunkCenterTokens),
        weight = Math.max(
          MINIMUM_CHUNK_ANCHOR_WEIGHT,
          Math.round(
            chunkRadiusTokens - distanceTokens + MINIMUM_CHUNK_ANCHOR_WEIGHT,
          ),
        );
      return {
        id: anchor.id,
        weight,
      };
    })
    .sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }
      if (left.id < right.id) {
        return -1;
      }
      if (left.id > right.id) {
        return 1;
      }
      return 0;
    });
};

const resolveChunkAnchorWeightsOrThrow = (
  anchors: ChunkAnchorPoint[],
  boundaries: number[],
  pageNumber: number,
  getPrefixTokenCount: PrefixTokenCounter,
): ChunkAnchorWeight[] => {
  const chunkAnchorWeights = resolveChunkAnchorWeights(
    anchors,
    boundaries,
    pageNumber,
    getPrefixTokenCount,
  );
  for (const chunkAnchorWeight of chunkAnchorWeights) {
    if (
      !Number.isInteger(chunkAnchorWeight.weight) ||
      chunkAnchorWeight.weight <= 0
    ) {
      throw new Error("chunk anchor 权重无效");
    }
  }
  return chunkAnchorWeights;
};

export { resolveChunkAnchorWeightsOrThrow };
