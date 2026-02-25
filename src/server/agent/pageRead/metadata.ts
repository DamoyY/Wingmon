import type { ChunkAnchorWeight } from "../../../shared/index.ts";
import {
  parseOptionalPositiveInteger,
  parseOptionalPositiveNumber,
} from "../validation/index.js";
import type { PageReadMetadata, PageReadMetadataInput } from "./contracts.ts";

export const controlIdPattern = /^[a-z0-9]+$/u;

const parseChunkAnchorWeightItem = (
    item: ChunkAnchorWeight,
    fieldName: string,
    index: number,
  ): ChunkAnchorWeight => {
    if (typeof item.id !== "string") {
      throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
    }
    const id = item.id.trim().toLowerCase();
    if (!id || !controlIdPattern.test(id)) {
      throw new Error(
        `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
      );
    }
    const weight = parseOptionalPositiveInteger(
      item.weight,
      `${fieldName}[${String(index)}].weight`,
    );
    if (weight === undefined) {
      throw new Error(`${fieldName}[${String(index)}].weight 必须是正整数`);
    }
    return {
      id,
      weight,
    };
  },
  parseOptionalChunkAnchorWeights = (
    value: readonly ChunkAnchorWeight[] | undefined,
    fieldName: string,
  ): ChunkAnchorWeight[] | undefined => {
    if (value === undefined) {
      return undefined;
    }
    const usedIds = new Set<string>();
    const chunkAnchorWeights = value.map((item, index) =>
      parseChunkAnchorWeightItem(item, fieldName, index),
    );
    chunkAnchorWeights.forEach((chunkAnchorWeight) => {
      if (usedIds.has(chunkAnchorWeight.id)) {
        throw new Error(`${fieldName} 存在重复 id：${chunkAnchorWeight.id}`);
      }
      usedIds.add(chunkAnchorWeight.id);
    });
    return chunkAnchorWeights;
  };

export const ensurePageInRange = (
  value: number,
  fieldName: string,
  totalPages: number,
): number => {
  if (value > totalPages) {
    throw new Error(
      `${fieldName} 超出范围：${String(value)} > ${String(totalPages)}`,
    );
  }
  return value;
};

export const normalizePageReadFailure = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error("页面内容获取失败");
};

export const resolvePageNumber = (value?: number): number =>
  parseOptionalPositiveInteger(value, "pageNumber") ?? 1;

export const resolvePageMetadata = (
  meta: PageReadMetadataInput,
  fallbackPageNumber?: number,
): PageReadMetadata => {
  const normalizedPageNumber =
      parseOptionalPositiveInteger(meta.pageNumber, "pageNumber") ??
      resolvePageNumber(fallbackPageNumber),
    totalPages =
      parseOptionalPositiveInteger(meta.totalPages, "totalPages") ??
      normalizedPageNumber,
    pageNumber = ensurePageInRange(
      normalizedPageNumber,
      "pageNumber",
      totalPages,
    ),
    viewportPage = ensurePageInRange(
      parseOptionalPositiveNumber(meta.viewportPage, "viewportPage") ??
        pageNumber,
      "viewportPage",
      totalPages,
    ),
    chunkAnchorWeights = parseOptionalChunkAnchorWeights(
      meta.chunkAnchorWeights,
      "chunkAnchorWeights",
    );
  return {
    chunkAnchorWeights,
    pageNumber,
    totalPages,
    viewportPage,
  };
};
