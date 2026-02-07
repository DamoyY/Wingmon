import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";
import { cloneBodyWithShadowDom, resolveRenderedText } from "./shadowDom.ts";
import { createO200kBaseEncoding } from "./tiktokenEncoding.ts";
import createTurndownService from "./turndownService.ts";
import {
  buildChunkAnchorMarker,
  chunkAnchorAttribute,
  chunkAnchorMarkerPattern,
} from "../dom/chunkAnchors.js";
import { Tiktoken as JsTiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";
import {
  resolvePageNumberInput,
  type PageNumberInput,
} from "../shared/index.ts";
import {
  createPrefixTokenCounter,
  splitMarkdownByTokens,
  type ChunkAnchorWeight,
} from "../../shared/index.ts";

type PageContentData = {
  body?: HTMLElement | null;
  title?: string;
  url?: string;
  pageNumber?: PageNumberInput;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
  totalPages: number;
  pageNumber: number;
  viewportPage: number;
  chunkAnchorWeights: ChunkAnchorWeight[];
  totalTokens: number;
};

type TurndownService = {
  turndown: (input: string) => string;
};

type CreateTurndownService = () => TurndownService;
type MarkdownEncoding = {
  encode: (text: string) => ArrayLike<number>;
};
type ChunkAnchorPoint = {
  id: string;
  index: number;
};
type ControlMarkerExtraction = {
  content: string;
  viewportIndex: number;
  anchors: ChunkAnchorPoint[];
};

const TOKENS_PER_PAGE = 5000;
const MINIMUM_CHUNK_ANCHOR_WEIGHT = 1;
const CONTROL_MARKER_PREFIXES = ["[button:", "[input:"] as const;

const createTurndownServiceTyped =
  createTurndownService as CreateTurndownService;
const turndown = createTurndownServiceTyped();

const createMarkdownEncoding = (): MarkdownEncoding => {
  try {
    return createO200kBaseEncoding();
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
const resolveMarkdownTokenLength = (text: string): number =>
  markdownEncoding.encode(text).length;
const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";

const markViewportCenter = (root: HTMLElement): string => {
  const viewportMarker = root.querySelector("[data-llm-viewport-center]");
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位分片");
  }
  viewportMarker.textContent = viewportMarkerToken;
  return viewportMarkerToken;
};

const insertChunkAnchorMarkers = (root: HTMLElement): void => {
  root.querySelectorAll(`[${chunkAnchorAttribute}]`).forEach((element) => {
    const anchorId = element.getAttribute(chunkAnchorAttribute);
    if (!anchorId) {
      return;
    }
    const marker = root.ownerDocument.createTextNode(
      buildChunkAnchorMarker(anchorId),
    );
    element.insertBefore(marker, element.firstChild);
  });
};

const extractControlMarkers = (
  contentWithMarkers: string,
  markerToken: string,
): ControlMarkerExtraction => {
  const anchors: ChunkAnchorPoint[] = [];
  const cleanSegments: string[] = [];
  let cursor = 0;
  let cleanLength = 0;
  let viewportIndex: number | null = null;
  const anchorPattern = new RegExp(chunkAnchorMarkerPattern.source, "g");
  while (cursor < contentWithMarkers.length) {
    anchorPattern.lastIndex = cursor;
    const anchorMatch = anchorPattern.exec(contentWithMarkers);
    const anchorStart = anchorMatch ? anchorMatch.index : -1;
    const viewportStart = contentWithMarkers.indexOf(markerToken, cursor);
    let markerStart = contentWithMarkers.length;
    let markerType: "anchor" | "viewport" | null = null;
    if (anchorStart >= 0 && anchorStart < markerStart) {
      markerStart = anchorStart;
      markerType = "anchor";
    }
    if (viewportStart >= 0 && viewportStart < markerStart) {
      markerStart = viewportStart;
      markerType = "viewport";
    }
    const segment = contentWithMarkers.slice(cursor, markerStart);
    if (segment) {
      cleanSegments.push(segment);
      cleanLength += segment.length;
    }
    if (!markerType) {
      break;
    }
    if (markerType === "viewport") {
      if (viewportIndex !== null) {
        throw new Error("视口中心标记重复，无法计算分片");
      }
      viewportIndex = cleanLength;
      cursor = markerStart + markerToken.length;
      continue;
    }
    const anchorId = anchorMatch?.[1];
    if (!anchorId) {
      throw new Error("页面分块锚点标记无效");
    }
    anchors.push({
      id: anchorId,
      index: cleanLength,
    });
    cursor = markerStart + anchorMatch[0].length;
  }
  if (viewportIndex === null) {
    throw new Error("视口中心标记丢失，无法计算分片");
  }
  return {
    content: cleanSegments.join(""),
    viewportIndex,
    anchors,
  };
};

const resolveChunkAnchorWeights = (
  anchors: ChunkAnchorPoint[],
  boundaries: number[],
  pageNumber: number,
  getPrefixTokenCount: (boundary: number) => number,
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
  getPrefixTokenCount: (boundary: number) => number,
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

const convertPageContentToMarkdown = (
  pageData: PageContentData | null = null,
): MarkdownPageContent => {
  if (!pageData?.body) {
    throw new Error("页面内容为空");
  }
  const bodyClone = cloneBodyWithShadowDom(pageData.body);
  replaceButtons(bodyClone);
  replaceInputs(bodyClone);
  insertChunkAnchorMarkers(bodyClone);
  const markerToken = markViewportCenter(bodyClone),
    markdownWithMarkers = turndown.turndown(bodyClone.innerHTML),
    resolvedContentWithMarkers = resolveTextFallback(
      pageData.body,
      markdownWithMarkers,
      markerToken,
    );
  const { content, viewportIndex, anchors } = extractControlMarkers(
      resolvedContentWithMarkers,
      markerToken,
    ),
    chunked = splitMarkdownByTokens(content, resolveMarkdownTokenLength, {
      tokensPerPage: TOKENS_PER_PAGE,
      controlMarkerPrefixes: CONTROL_MARKER_PREFIXES,
    }),
    pageNumber = resolvePageNumberInput(pageData.pageNumber ?? null);
  if (pageNumber > chunked.totalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(chunked.totalPages)}`,
    );
  }
  const prefixTokenCounter = createPrefixTokenCounter(
      content,
      resolveMarkdownTokenLength,
    ),
    markerTokenCount = prefixTokenCounter(viewportIndex),
    viewportPageRaw =
      chunked.totalTokens > 0
        ? (markerTokenCount / chunked.totalTokens) * chunked.totalPages
        : 1,
    viewportPage = Math.min(chunked.totalPages, Math.max(1, viewportPageRaw)),
    chunkAnchorWeights = resolveChunkAnchorWeightsOrThrow(
      anchors,
      chunked.boundaries,
      pageNumber,
      prefixTokenCounter,
    );
  const pageChunk = chunked.chunks[pageNumber - 1];
  if (typeof pageChunk !== "string") {
    throw new Error("分片内容缺失");
  }
  return {
    title: pageData.title ?? "",
    url: pageData.url ?? "",
    content: pageChunk,
    totalPages: chunked.totalPages,
    pageNumber,
    viewportPage,
    chunkAnchorWeights,
    totalTokens: chunked.totalTokens,
  };
};

export default convertPageContentToMarkdown;
