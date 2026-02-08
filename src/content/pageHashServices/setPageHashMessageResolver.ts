import type {
  ChunkAnchorWeight,
  SetPageHashRequest,
} from "../../shared/index.ts";
import {
  resolveAliasedInput,
  resolveAliasedPageNumberInput,
} from "../common/index.ts";

type ChunkAnchorWeightsInput = ChunkAnchorWeight[] | null;

const chunkAnchorIdPattern = /^[a-z0-9]+$/u;

const normalizeChunkAnchorId = (value: string, fieldName: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || !chunkAnchorIdPattern.test(normalized)) {
    throw new Error(`${fieldName} 必须是非空字母数字字符串`);
  }
  return normalized;
};

const resolveChunkAnchorWeights = (
  value: ChunkAnchorWeightsInput,
): ChunkAnchorWeight[] | null => {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new Error("chunk_anchor_weights 必须是数组");
  }
  const resolvedWeights: ChunkAnchorWeight[] = [];
  const usedAnchorIds = new Set<string>();
  value.forEach((chunkAnchorWeight, index) => {
    const fieldPrefix = `chunk_anchor_weights[${String(index)}]`,
      chunkAnchorRecord =
        chunkAnchorWeight as Partial<ChunkAnchorWeight> | null;
    if (!chunkAnchorRecord || typeof chunkAnchorRecord !== "object") {
      throw new Error(`${fieldPrefix} 必须是对象`);
    }
    if (typeof chunkAnchorRecord.id !== "string") {
      throw new Error(`${fieldPrefix}.id 必须是字符串`);
    }
    const normalizedId = normalizeChunkAnchorId(
      chunkAnchorRecord.id,
      `${fieldPrefix}.id`,
    );
    if (usedAnchorIds.has(normalizedId)) {
      throw new Error(`chunk_anchor_weights 存在重复 id：${normalizedId}`);
    }
    usedAnchorIds.add(normalizedId);
    if (
      !Number.isInteger(chunkAnchorRecord.weight) ||
      chunkAnchorRecord.weight <= 0
    ) {
      throw new Error(`${fieldPrefix}.weight 必须是正整数`);
    }
    resolvedWeights.push({
      id: normalizedId,
      weight: chunkAnchorRecord.weight,
    });
  });
  return resolvedWeights;
};

const areChunkAnchorWeightsEqual = (
  left: ChunkAnchorWeight[] | null,
  right: ChunkAnchorWeight[] | null,
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftWeight = left[index],
      rightWeight = right[index];
    if (
      leftWeight.id !== rightWeight.id ||
      leftWeight.weight !== rightWeight.weight
    ) {
      return false;
    }
  }
  return true;
};

export const resolveSetPageHashPageNumber = (
  message: SetPageHashRequest,
): number => {
  return resolveAliasedPageNumberInput({
    camelProvided: "pageNumber" in message,
    camelValue: message.pageNumber ?? null,
    defaultValue: 1,
    mismatchMessage: "pageNumber 与 page_number 不一致",
    snakeProvided: "page_number" in message,
    snakeValue: message.page_number ?? null,
  });
};

export const resolveSetPageHashTotalPages = (
  message: SetPageHashRequest,
): number | null => {
  return resolveAliasedPageNumberInput({
    camelProvided: "totalPages" in message,
    camelValue: message.totalPages ?? null,
    defaultValue: null,
    mismatchMessage: "totalPages 与 total_pages 不一致",
    snakeProvided: "total_pages" in message,
    snakeValue: message.total_pages ?? null,
  });
};

export const resolveSetPageHashChunkAnchorWeights = (
  message: SetPageHashRequest,
): ChunkAnchorWeight[] | null => {
  return resolveAliasedInput<
    ChunkAnchorWeightsInput,
    ChunkAnchorWeight[] | null
  >({
    camelProvided: "chunkAnchorWeights" in message,
    camelValue: message.chunkAnchorWeights ?? null,
    defaultValue: null,
    equals: areChunkAnchorWeightsEqual,
    mismatchMessage: "chunkAnchorWeights 与 chunk_anchor_weights 不一致",
    resolve: resolveChunkAnchorWeights,
    snakeProvided: "chunk_anchor_weights" in message,
    snakeValue: message.chunk_anchor_weights ?? null,
  });
};
