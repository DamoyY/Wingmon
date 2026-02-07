import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import { chunkAnchorAttribute } from "../dom/chunkAnchors.js";
import convertPageContentToMarkdown from "../extractors/converter.js";
import type {
  ChunkAnchorWeight,
  SetPageHashRequest,
  SetPageHashResponse,
} from "../../shared/index.ts";
import {
  resolveAliasedInput,
  resolveAliasedPageNumberInput,
  resolvePageNumberInput,
} from "../shared/index.ts";

type ChunkAnchorWeightsInput = ChunkAnchorWeight[] | null;

type SendResponse = (response: SetPageHashResponse) => void;

type ChunkAnchorCenterPoint = {
  id: string;
  weight: number;
  anchorSelector: string;
  anchorRectTop: number;
  anchorRectHeight: number;
  anchorAbsoluteCenterY: number;
};

type ChunkAnchorScrollResult =
  | {
      ok: true;
      anchors: ChunkAnchorCenterPoint[];
      missingAnchorIds: string[];
      weightedMedianCenterY: number;
      totalWeight: number;
      targetTop: number;
    }
  | {
      ok: false;
      reason: "chunk_anchor_not_found" | "chunk_anchor_not_scrollable";
      anchors: ChunkAnchorCenterPoint[];
      missingAnchorIds: string[];
    };

type HtmlFallbackScrollMetrics = {
  ratio: number;
  maxScrollTop: number;
  targetTop: number;
  documentHeight: number;
  bodyHeight: number;
};

const resolveMessagePageNumber = (message: SetPageHashRequest): number => {
  return resolveAliasedPageNumberInput({
    camelProvided: "pageNumber" in message,
    snakeProvided: "page_number" in message,
    camelValue: message.pageNumber ?? null,
    snakeValue: message.page_number ?? null,
    mismatchMessage: "pageNumber 与 page_number 不一致",
    defaultValue: 1,
  });
};

const resolveMessageTotalPages = (
  message: SetPageHashRequest,
): number | null => {
  return resolveAliasedPageNumberInput({
    camelProvided: "totalPages" in message,
    snakeProvided: "total_pages" in message,
    camelValue: message.totalPages ?? null,
    snakeValue: message.total_pages ?? null,
    mismatchMessage: "totalPages 与 total_pages 不一致",
    defaultValue: null,
  });
};

const chunkAnchorIdPattern = /^[a-z0-9]+$/i;

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

const resolveMessageChunkAnchorWeights = (
  message: SetPageHashRequest,
): ChunkAnchorWeight[] | null => {
  return resolveAliasedInput<
    ChunkAnchorWeightsInput,
    ChunkAnchorWeight[] | null
  >({
    camelProvided: "chunkAnchorWeights" in message,
    snakeProvided: "chunk_anchor_weights" in message,
    camelValue: message.chunkAnchorWeights ?? null,
    snakeValue: message.chunk_anchor_weights ?? null,
    mismatchMessage: "chunkAnchorWeights 与 chunk_anchor_weights 不一致",
    defaultValue: null,
    resolve: resolveChunkAnchorWeights,
    equals: areChunkAnchorWeightsEqual,
  });
};

const resolveHtmlFallbackScrollMetrics = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  const resolvedTotalPages = resolvePageNumberInput(totalPages, "page_number");
  if (pageNumber > resolvedTotalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(resolvedTotalPages)}`,
    );
  }
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  const ratio =
      resolvedTotalPages <= 1 ? 0 : (pageNumber - 1) / (resolvedTotalPages - 1),
    documentHeight = document.documentElement.scrollHeight,
    bodyHeight = body.scrollHeight,
    maxScrollTop = Math.max(documentHeight, bodyHeight) - window.innerHeight,
    targetTop = Math.max(0, maxScrollTop) * ratio;
  return {
    ratio,
    maxScrollTop,
    targetTop,
    documentHeight,
    bodyHeight,
  };
};

const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};

const resolveScrollBehavior = (): ScrollBehavior => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
};

const scrollWindowTo = (top: number): void => {
  window.scrollTo({
    top,
    behavior: resolveScrollBehavior(),
  });
};

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolveHtmlTotalPages = (): number => {
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  let marker: HTMLSpanElement | null = null;
  try {
    marker = insertViewportMarker(body);
    assignLlmIds(body);
    const markdown = convertPageContentToMarkdown({
      body,
      title: document.title || "",
      url: window.location.href || "",
      pageNumber: 1,
    });
    return markdown.totalPages;
  } finally {
    if (marker?.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};

const scrollHtmlByPage = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  const metrics = resolveHtmlFallbackScrollMetrics(pageNumber, totalPages);
  scrollWindowTo(metrics.targetTop);
  return metrics;
};

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

const scrollHtmlByChunkAnchors = (
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

const warnFallbackToPageRatioScroll = ({
  reason,
  pageNumber,
  totalPages,
  chunkAnchorWeights,
  fallbackMetrics,
  anchorResult,
}: {
  reason: string;
  pageNumber: number;
  totalPages: number;
  chunkAnchorWeights: ChunkAnchorWeight[] | null;
  fallbackMetrics: HtmlFallbackScrollMetrics;
  anchorResult: ChunkAnchorScrollResult | null;
}): void => {
  console.warn("chunk anchor 滚动失败，已回退为比例滚动", {
    reason,
    pageNumber,
    totalPages,
    chunkAnchorWeights,
    url: window.location.href || "",
    title: document.title || "",
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollYBeforeFallback: window.scrollY,
    },
    fallback: fallbackMetrics,
    anchor: anchorResult,
  });
};

const handleSetPageHash = (
  message: SetPageHashRequest,
  sendResponse: SendResponse,
): void => {
  try {
    const pageNumber = resolveMessagePageNumber(message),
      chunkAnchorWeights = resolveMessageChunkAnchorWeights(message);
    if (isHtmlDocument()) {
      const providedTotalPages = resolveMessageTotalPages(message),
        totalPages = providedTotalPages ?? resolveHtmlTotalPages();
      if (!chunkAnchorWeights) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          reason: "chunk_anchor_weights_missing",
          pageNumber,
          totalPages,
          chunkAnchorWeights: null,
          fallbackMetrics,
          anchorResult: null,
        });
      } else if (!chunkAnchorWeights.length) {
        const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
        warnFallbackToPageRatioScroll({
          reason: "chunk_anchor_weights_empty",
          pageNumber,
          totalPages,
          chunkAnchorWeights,
          fallbackMetrics,
          anchorResult: null,
        });
      } else {
        const anchorResult = scrollHtmlByChunkAnchors(chunkAnchorWeights);
        if (!anchorResult.ok) {
          const fallbackMetrics = scrollHtmlByPage(pageNumber, totalPages);
          warnFallbackToPageRatioScroll({
            reason: anchorResult.reason,
            pageNumber,
            totalPages,
            chunkAnchorWeights,
            fallbackMetrics,
            anchorResult,
          });
        }
      }
      sendResponse({
        ok: true,
        shouldReload: false,
        pageNumber,
        totalPages,
      });
      return;
    }
    window.location.hash = `page=${String(pageNumber)}`;
    sendResponse({ ok: true, shouldReload: true, pageNumber });
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面跳转失败",
    );
  }
};

export default handleSetPageHash;
