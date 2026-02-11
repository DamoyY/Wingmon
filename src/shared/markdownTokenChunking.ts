type TokenLengthResolver = (text: string) => number;

type MarkdownChunkResult = {
  chunks: string[];
  boundaries: number[];
  totalTokens: number;
  totalPages: number;
};

type MarkdownChunkingOptions = {
  tokensPerPage: number;
  controlMarkerPrefixes: readonly string[];
};

const MARKDOWN_CHUNK_TOKENS = 5000;
const controlMarkerSuffix = ">>";

const assertNonNegativeInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} 必须为非负整数`);
  }
};

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} 必须为正整数`);
  }
};

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

const resolveTokenLength = (
  content: string,
  tokenLengthResolver: TokenLengthResolver,
  label: string,
): number => {
  const tokenLength = tokenLengthResolver(content);
  assertNonNegativeInteger(tokenLength, label);
  return tokenLength;
};

const createPrefixTokenCounter = (
  content: string,
  tokenLengthResolver: TokenLengthResolver,
): ((boundary: number) => number) => {
  const tokenCountCache = new Map<number, number>([[0, 0]]);
  return (boundary: number): number => {
    const normalizedBoundary = clampBoundary(boundary, content.length),
      cached = tokenCountCache.get(normalizedBoundary);
    if (typeof cached === "number") {
      return cached;
    }
    const tokenCount = resolveTokenLength(
      content.slice(0, normalizedBoundary),
      tokenLengthResolver,
      "前缀 token 数",
    );
    tokenCountCache.set(normalizedBoundary, tokenCount);
    return tokenCount;
  };
};

const findBoundaryByTargetTokens = (
  getPrefixTokenCount: (boundary: number) => number,
  targetTokens: number,
  minBoundary: number,
  maxBoundary: number,
): number => {
  let low = minBoundary,
    high = maxBoundary;
  while (low < high) {
    const middle = Math.floor((low + high) / 2),
      middleTokenCount = getPrefixTokenCount(middle);
    if (middleTokenCount < targetTokens) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
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
    const markerEnd = content.indexOf(controlMarkerSuffix, markerStart);
    if (markerEnd < 0) {
      throw new Error("控件标记未闭合");
    }
    const markerAfterEnd = markerEnd + controlMarkerSuffix.length;
    if (adjustedBoundary <= markerStart || adjustedBoundary >= markerAfterEnd) {
      return adjustedBoundary;
    }
    adjustedBoundary = markerAfterEnd;
  }
  return adjustedBoundary;
};

const splitMarkdownByTokens = (
  content: string,
  tokenLengthResolver: TokenLengthResolver,
  options: MarkdownChunkingOptions,
): MarkdownChunkResult => {
  assertPositiveInteger(options.tokensPerPage, "每页 token 上限");
  const totalTokens = resolveTokenLength(
      content,
      tokenLengthResolver,
      "总 token 数",
    ),
    totalPages = Math.max(1, Math.round(totalTokens / options.tokensPerPage));
  if (totalPages === 1) {
    return {
      boundaries: [0, content.length],
      chunks: [content],
      totalPages,
      totalTokens,
    };
  }
  const getPrefixTokenCount = createPrefixTokenCounter(
      content,
      tokenLengthResolver,
    ),
    boundaries: number[] = [0];
  let previousBoundary = 0;
  for (let page = 1; page < totalPages; page += 1) {
    const targetTokens = Math.round((totalTokens * page) / totalPages),
      remainingChunks = totalPages - page,
      minBoundary = previousBoundary + 1,
      maxBoundary = content.length - remainingChunks;
    if (minBoundary > maxBoundary) {
      throw new Error("分片边界超出内容范围");
    }
    let boundary = findBoundaryByTargetTokens(
      getPrefixTokenCount,
      targetTokens,
      minBoundary,
      maxBoundary,
    );
    boundary = moveBoundaryAfterControlMarker(
      content,
      boundary,
      options.controlMarkerPrefixes,
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
    boundaries,
    chunks,
    totalPages,
    totalTokens,
  };
};

export {
  MARKDOWN_CHUNK_TOKENS,
  clampBoundary,
  createPrefixTokenCounter,
  findControlMarkerStart,
  moveBoundaryAfterControlMarker,
  splitMarkdownByTokens,
};
export type {
  MarkdownChunkResult,
  MarkdownChunkingOptions,
  TokenLengthResolver,
};
