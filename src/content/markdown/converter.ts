import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";
import { cloneBodyWithShadowDom, resolveRenderedText } from "./shadowDom.ts";
import createTurndownService from "./turndownService.js";
import { Tiktoken as JsTiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";
import * as tiktoken from "tiktoken/init";
import tiktokenWasmBytes from "tiktoken/tiktoken_bg.wasm";

type PageContentData = {
  body?: HTMLElement | null;
  title?: string;
  url?: string;
  pageNumber?: unknown;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
  totalPages: number;
  pageNumber: number;
  viewportPage: number;
  totalTokens: number;
};

type TurndownService = {
  turndown: (input: string) => string;
};

type TiktokenInitModule = typeof tiktoken & {
  __wbg_set_wasm: (exports: WebAssembly.Exports) => void;
};

type CreateTurndownService = () => TurndownService;
type MarkdownEncoding = {
  encode: (text: string) => ArrayLike<number>;
};
type ChunkResult = {
  chunks: string[];
  boundaries: number[];
  totalTokens: number;
  totalPages: number;
};

const TOKENS_PER_PAGE = 5000;
const CONTROL_MARKER_PREFIXES = ["[button:", "[input:"] as const;

const createTurndownServiceTyped =
  createTurndownService as CreateTurndownService;
const turndown = createTurndownServiceTyped();
const tiktokenInit = tiktoken as TiktokenInitModule;

const createMarkdownEncoding = (): MarkdownEncoding => {
  try {
    const wasmModule = new WebAssembly.Module(tiktokenWasmBytes),
      wasmInstance = new WebAssembly.Instance(wasmModule, {
        "./tiktoken_bg.js": tiktoken,
      });
    tiktokenInit.__wbg_set_wasm(wasmInstance.exports);
    return tiktoken.get_encoding("o200k_base");
  } catch (wasmError) {
    console.warn("tiktoken WASM 初始化失败，回退至 js-tiktoken", wasmError);
    try {
      return new JsTiktoken(o200kBase);
    } catch (jsError) {
      console.error("js-tiktoken 初始化失败", jsError);
      throw jsError;
    }
  }
};

const markdownEncoding = createMarkdownEncoding();
const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";

const markViewportCenter = (root: HTMLElement): string => {
  const viewportMarker = root.querySelector("[data-llm-viewport-center]");
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位分片");
  }
  viewportMarker.textContent = viewportMarkerToken;
  return viewportMarkerToken;
};

const resolveTextFallback = (
  body: HTMLElement,
  htmlContent: string,
  markerToken: string,
): string => {
  const fallbackText = resolveRenderedText(body),
    htmlTrimmed = htmlContent.trim(),
    textTrimmed = fallbackText.trim();
  if (!textTrimmed) {
    return htmlContent;
  }
  if (!htmlTrimmed) {
    console.warn("页面 HTML 提取为空，已改用渲染文本");
    return textTrimmed;
  }
  if (
    textTrimmed.length > htmlTrimmed.length * 2 &&
    textTrimmed.length - htmlTrimmed.length > 200
  ) {
    if (
      htmlContent.includes(markerToken) &&
      !textTrimmed.includes(markerToken)
    ) {
      console.warn("页面渲染文本回退会丢失视口标记，继续使用 Markdown 内容");
      return htmlContent;
    }
    console.warn("页面 HTML 提取内容偏少，已改用渲染文本", {
      htmlLength: htmlTrimmed.length,
      textLength: textTrimmed.length,
    });
    return textTrimmed;
  }
  return htmlContent;
};

const resolveRequestedPageNumber = (value: unknown): number => {
  if (value === undefined || value === null) {
    return 1;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error("page_number 必须是正整数");
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

const findControlMarkerStart = (content: string, boundary: number): number => {
  const searchIndex = Math.max(0, boundary - 1);
  return CONTROL_MARKER_PREFIXES.reduce<number>((maxStart, prefix) => {
    const start = content.lastIndexOf(prefix, searchIndex);
    return start > maxStart ? start : maxStart;
  }, -1);
};

const moveBoundaryAfterControlMarker = (
  content: string,
  boundary: number,
): number => {
  let adjustedBoundary = clampBoundary(boundary, content.length);
  while (adjustedBoundary > 0 && adjustedBoundary < content.length) {
    const markerStart = findControlMarkerStart(content, adjustedBoundary);
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

const buildPrefixTokenCounter = (
  content: string,
): ((boundary: number) => number) => {
  const tokenCountCache = new Map<number, number>([[0, 0]]);
  return (boundary: number): number => {
    const normalizedBoundary = clampBoundary(boundary, content.length);
    const cached = tokenCountCache.get(normalizedBoundary);
    if (cached !== undefined) {
      return cached;
    }
    const count = markdownEncoding.encode(
      content.slice(0, normalizedBoundary),
    ).length;
    tokenCountCache.set(normalizedBoundary, count);
    return count;
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

const splitMarkdownByTokens = (content: string): ChunkResult => {
  const totalTokens = markdownEncoding.encode(content).length,
    totalPages = Math.max(1, Math.round(totalTokens / TOKENS_PER_PAGE));
  if (totalPages === 1) {
    return {
      chunks: [content],
      boundaries: [0, content.length],
      totalTokens,
      totalPages,
    };
  }
  const getPrefixTokenCount = buildPrefixTokenCounter(content),
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
    boundary = moveBoundaryAfterControlMarker(content, boundary);
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
    totalTokens,
    totalPages,
  };
};

const convertPageContentToMarkdown = (
  pageData?: PageContentData | null,
): MarkdownPageContent => {
  if (!pageData?.body) {
    throw new Error("页面内容为空");
  }
  const bodyClone = cloneBodyWithShadowDom(pageData.body);
  replaceButtons(bodyClone);
  replaceInputs(bodyClone);
  const markerToken = markViewportCenter(bodyClone),
    markdownWithMarker = turndown.turndown(bodyClone.innerHTML),
    resolvedContentWithMarker = resolveTextFallback(
      pageData.body,
      markdownWithMarker,
      markerToken,
    ),
    markerIndex = resolvedContentWithMarker.indexOf(markerToken);
  if (markerIndex < 0) {
    throw new Error("视口中心标记丢失，无法计算分片");
  }
  const content = `${resolvedContentWithMarker.slice(0, markerIndex)}${resolvedContentWithMarker.slice(markerIndex + markerToken.length)}`,
    chunked = splitMarkdownByTokens(content),
    pageNumber = resolveRequestedPageNumber(pageData.pageNumber);
  if (pageNumber > chunked.totalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(chunked.totalPages)}`,
    );
  }
  const markerTokenCount = markdownEncoding.encode(
      content.slice(0, markerIndex),
    ).length,
    viewportPageRaw =
      chunked.totalTokens > 0
        ? (markerTokenCount / chunked.totalTokens) * chunked.totalPages
        : 1,
    viewportPage = Math.min(chunked.totalPages, Math.max(1, viewportPageRaw));
  return {
    title: pageData.title ?? "",
    url: pageData.url ?? "",
    content: chunked.chunks[pageNumber - 1] ?? "",
    totalPages: chunked.totalPages,
    pageNumber,
    viewportPage,
    totalTokens: chunked.totalTokens,
  };
};

export default convertPageContentToMarkdown;
