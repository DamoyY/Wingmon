import {
  MARKDOWN_CHUNK_TOKENS,
  createPrefixTokenCounter,
  splitMarkdownByTokens,
  type MarkdownChunkResult,
} from "../../shared/index.ts";
import { CONTROL_MARKER_PREFIXES } from "./controlMarkers.ts";
import {
  resolveMarkdownTokenByteBoundaries,
  resolveMarkdownTokenLength,
} from "./markdownTokenLength.ts";

type PrefixTokenCounter = (boundary: number) => number;

type MarkdownChunkingOutput = {
  chunked: MarkdownChunkResult;
  prefixTokenCounter: PrefixTokenCounter;
};

const utf8Encoder = new TextEncoder();

const clampBoundary = (boundary: number, contentLength: number): number => {
  if (!Number.isInteger(boundary)) {
    throw new Error("分片边界必须为整数");
  }
  if (boundary < 0) {
    return 0;
  }
  if (boundary > contentLength) {
    return contentLength;
  }
  return boundary;
};

const findControlMarkerStart = (
  content: string,
  boundary: number,
  controlMarkerPrefixes: readonly string[],
): number => {
  const searchIndex = Math.max(0, boundary - 1);
  return controlMarkerPrefixes.reduce<number>((maxStart, prefix) => {
    const start = content.lastIndexOf(prefix, searchIndex);
    return start > maxStart ? start : maxStart;
  }, -1);
};

const moveBoundaryAfterControlMarker = (
  content: string,
  boundary: number,
  controlMarkerPrefixes: readonly string[],
): number => {
  let adjustedBoundary = clampBoundary(boundary, content.length);
  while (adjustedBoundary > 0 && adjustedBoundary < content.length) {
    const markerStart = findControlMarkerStart(
      content,
      adjustedBoundary,
      controlMarkerPrefixes,
    );
    if (markerStart < 0) {
      return adjustedBoundary;
    }
    const markerEnd = content.indexOf("]", markerStart);
    if (markerEnd < 0) {
      throw new Error("控件标记未闭合");
    }
    const markerAfterEnd = markerEnd + 1;
    if (adjustedBoundary <= markerStart || adjustedBoundary >= markerAfterEnd) {
      return adjustedBoundary;
    }
    adjustedBoundary = markerAfterEnd;
  }
  return adjustedBoundary;
};

const lowerBound = (values: readonly number[], target: number): number => {
  let low = 0,
    high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2),
      middleValue = values[middle];
    if (!Number.isInteger(middleValue)) {
      throw new Error("边界映射值无效");
    }
    if (middleValue < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const upperBound = (values: readonly number[], target: number): number => {
  let low = 0,
    high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2),
      middleValue = values[middle];
    if (!Number.isInteger(middleValue)) {
      throw new Error("边界映射值无效");
    }
    if (middleValue <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const buildByteToCodeUnitMap = (
  content: string,
  totalBytes: number,
): number[] => {
  if (!Number.isInteger(totalBytes) || totalBytes < 0) {
    throw new Error("总字节数无效");
  }
  const byteToCodeUnit = new Array<number>(totalBytes + 1);
  byteToCodeUnit[0] = 0;
  let byteOffset = 0,
    codeUnitOffset = 0;
  for (const char of content) {
    byteOffset += utf8Encoder.encode(char).length;
    codeUnitOffset += char.length;
    byteToCodeUnit[byteOffset] = codeUnitOffset;
  }
  if (byteOffset !== totalBytes) {
    throw new Error("文本 UTF-8 字节长度校验失败");
  }
  for (let index = 1; index < byteToCodeUnit.length; index += 1) {
    const mapped = byteToCodeUnit[index];
    if (typeof mapped === "number") {
      continue;
    }
    const previous = byteToCodeUnit[index - 1];
    if (!Number.isInteger(previous)) {
      throw new Error("byte 到 code unit 映射填充失败");
    }
    byteToCodeUnit[index] = previous;
  }
  const lastCodeUnit = byteToCodeUnit[byteToCodeUnit.length - 1];
  if (lastCodeUnit !== content.length) {
    throw new Error("byte 到 code unit 映射末端与内容长度不一致");
  }
  return byteToCodeUnit;
};

const resolveTokenBoundaryCodeUnits = (
  tokenByteBoundaries: readonly number[],
  byteToCodeUnit: readonly number[],
): number[] => {
  if (tokenByteBoundaries.length === 0) {
    throw new Error("token 字节边界为空");
  }
  const lastByteBoundary = tokenByteBoundaries[tokenByteBoundaries.length - 1];
  if (!Number.isInteger(lastByteBoundary) || lastByteBoundary < 0) {
    throw new Error("token 字节边界末端无效");
  }
  if (lastByteBoundary !== byteToCodeUnit.length - 1) {
    throw new Error("token 字节边界与文本总字节数不一致");
  }
  const codeUnits = tokenByteBoundaries.map((byteBoundary) => {
    if (!Number.isInteger(byteBoundary) || byteBoundary < 0) {
      throw new Error("token 字节边界无效");
    }
    const mapped = byteToCodeUnit[byteBoundary];
    if (!Number.isInteger(mapped) || mapped < 0) {
      throw new Error("token 字节边界映射失败");
    }
    return mapped;
  });
  for (let index = 1; index < codeUnits.length; index += 1) {
    const previous = codeUnits[index - 1],
      current = codeUnits[index];
    if (!Number.isInteger(previous) || !Number.isInteger(current)) {
      throw new Error("token 边界映射包含非法值");
    }
    if (current < previous) {
      throw new Error("token 边界映射未保持递增");
    }
  }
  return codeUnits;
};

const resolveBoundaryByTargetTokens = (
  tokenBoundaryCodeUnits: readonly number[],
  targetTokens: number,
  minBoundary: number,
  maxBoundary: number,
): number => {
  const minTokenIndex = lowerBound(tokenBoundaryCodeUnits, minBoundary),
    maxTokenIndex = upperBound(tokenBoundaryCodeUnits, maxBoundary) - 1;
  if (minTokenIndex > maxTokenIndex) {
    return minBoundary;
  }
  const clampedTarget = Math.min(
      maxTokenIndex,
      Math.max(minTokenIndex, targetTokens),
    ),
    boundary = tokenBoundaryCodeUnits[clampedTarget];
  if (!Number.isInteger(boundary)) {
    throw new Error("目标 token 边界无效");
  }
  return boundary;
};

const splitMarkdownByTokenBoundaries = (
  content: string,
): MarkdownChunkResult => {
  const tokenBoundaries = resolveMarkdownTokenByteBoundaries(content),
    totalPages = Math.max(
      1,
      Math.round(tokenBoundaries.totalTokens / MARKDOWN_CHUNK_TOKENS),
    );
  if (totalPages === 1) {
    return {
      chunks: [content],
      boundaries: [0, content.length],
      totalTokens: tokenBoundaries.totalTokens,
      totalPages,
    };
  }
  const byteToCodeUnit = buildByteToCodeUnitMap(
      content,
      tokenBoundaries.totalBytes,
    ),
    tokenBoundaryCodeUnits = resolveTokenBoundaryCodeUnits(
      tokenBoundaries.tokenByteBoundaries,
      byteToCodeUnit,
    ),
    boundaries: number[] = [0];
  let previousBoundary = 0;
  for (let page = 1; page < totalPages; page += 1) {
    const targetTokens = Math.round(
        (tokenBoundaries.totalTokens * page) / totalPages,
      ),
      remainingChunks = totalPages - page,
      minBoundary = previousBoundary + 1,
      maxBoundary = content.length - remainingChunks;
    if (minBoundary > maxBoundary) {
      throw new Error("分片边界超出内容范围");
    }
    let boundary = resolveBoundaryByTargetTokens(
      tokenBoundaryCodeUnits,
      targetTokens,
      minBoundary,
      maxBoundary,
    );
    boundary = moveBoundaryAfterControlMarker(
      content,
      boundary,
      CONTROL_MARKER_PREFIXES,
    );
    if (boundary > maxBoundary) {
      throw new Error("分片边界落在控件标记内且无法后移");
    }
    if (boundary < minBoundary) {
      throw new Error("分片边界无效");
    }
    boundaries.push(boundary);
    previousBoundary = boundary;
  }
  boundaries.push(content.length);
  const chunks = boundaries
    .slice(0, -1)
    .map((start, index) => content.slice(start, boundaries[index + 1]));
  return {
    chunks,
    boundaries,
    totalTokens: tokenBoundaries.totalTokens,
    totalPages,
  };
};

const resolveChunkedResult = (content: string): MarkdownChunkResult => {
  try {
    return splitMarkdownByTokenBoundaries(content);
  } catch (error) {
    console.error("基于 token 字节映射的分片失败，已回退二分分片", error);
    return splitMarkdownByTokens(content, resolveMarkdownTokenLength, {
      tokensPerPage: MARKDOWN_CHUNK_TOKENS,
      controlMarkerPrefixes: CONTROL_MARKER_PREFIXES,
    });
  }
};

const chunkMarkdownContent = (content: string): MarkdownChunkingOutput => {
  const chunked = resolveChunkedResult(content),
    prefixTokenCounter = createPrefixTokenCounter(
      content,
      resolveMarkdownTokenLength,
    );
  return {
    chunked,
    prefixTokenCounter,
  };
};

export { chunkMarkdownContent };
export type { MarkdownChunkingOutput, PrefixTokenCounter };
