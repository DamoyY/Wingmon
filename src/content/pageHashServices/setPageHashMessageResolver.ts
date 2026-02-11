import type {
  ChunkAnchorWeight,
  SetPageHashRequest,
} from "../../shared/index.ts";
import { resolvePageNumberInput } from "../common/index.ts";

const chunkAnchorIdPattern = /^[a-z0-9]+$/u;

const normalizeChunkAnchorId = (value: string, fieldName: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || !chunkAnchorIdPattern.test(normalized)) {
    throw new Error(`${fieldName} 必须是非空字母数字字符串`);
  }
  return normalized;
};

const resolveChunkAnchorWeights = (
  value: readonly ChunkAnchorWeight[] | undefined,
): ChunkAnchorWeight[] | null => {
  if (value === undefined) {
    return null;
  }
  const resolvedWeights: ChunkAnchorWeight[] = [];
  const usedAnchorIds = new Set<string>();
  value.forEach((chunkAnchorWeight, index) => {
    const fieldPrefix = `chunkAnchorWeights[${String(index)}]`;
    if (typeof chunkAnchorWeight.id !== "string") {
      throw new Error(`${fieldPrefix}.id 必须是字符串`);
    }
    const normalizedId = normalizeChunkAnchorId(
      chunkAnchorWeight.id,
      `${fieldPrefix}.id`,
    );
    if (usedAnchorIds.has(normalizedId)) {
      throw new Error(`chunkAnchorWeights 存在重复 id：${normalizedId}`);
    }
    usedAnchorIds.add(normalizedId);
    if (
      !Number.isInteger(chunkAnchorWeight.weight) ||
      chunkAnchorWeight.weight <= 0
    ) {
      throw new Error(`${fieldPrefix}.weight 必须是正整数`);
    }
    resolvedWeights.push({
      id: normalizedId,
      weight: chunkAnchorWeight.weight,
    });
  });
  return resolvedWeights;
};

export const resolveSetPageHashPageNumber = (
  message: SetPageHashRequest,
): number => {
  return resolvePageNumberInput(message.pageNumber ?? null, "pageNumber");
};

export const resolveSetPageHashTotalPages = (
  message: SetPageHashRequest,
): number | null => {
  const { totalPages } = message;
  if (totalPages === undefined) {
    return null;
  }
  return resolvePageNumberInput(totalPages, "totalPages");
};

export const resolveSetPageHashChunkAnchorWeights = (
  message: SetPageHashRequest,
): ChunkAnchorWeight[] | null => {
  return resolveChunkAnchorWeights(message.chunkAnchorWeights);
};
