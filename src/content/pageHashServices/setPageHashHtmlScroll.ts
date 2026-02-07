import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import convertPageContentToMarkdown from "../extractors/converter.js";
import { resolvePageNumberInput } from "../common/index.ts";
import type { HtmlFallbackScrollMetrics } from "./setPageHashTypes.js";

const resolveScrollBehavior = (): ScrollBehavior => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
};

export const scrollWindowTo = (top: number): void => {
  window.scrollTo({
    top,
    behavior: resolveScrollBehavior(),
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

export const scrollHtmlByPage = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  const metrics = resolveHtmlFallbackScrollMetrics(pageNumber, totalPages);
  scrollWindowTo(metrics.targetTop);
  return metrics;
};

export const resolveHtmlTotalPages = (): number => {
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

export const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};
