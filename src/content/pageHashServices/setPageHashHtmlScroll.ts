import type { HtmlFallbackScrollMetrics } from "./setPageHashTypes.js";
import { assignLlmIds } from "../dom/index.js";
import convertPageContentToMarkdown from "../extractors/converter.js";
import { parseRequiredPositiveInteger } from "../../shared/index.ts";
import { resolvePageNumberInput } from "../common/index.ts";

const resolveScrollBehavior = (): ScrollBehavior => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
};

export const scrollWindowTo = (top: number): void => {
  window.scrollTo({
    behavior: resolveScrollBehavior(),
    top,
  });
};

const resolveHtmlFallbackScrollMetrics = (
  pageNumber: number,
  totalPages: number,
): HtmlFallbackScrollMetrics => {
  const resolvedTotalPages = resolvePageNumberInput(totalPages, "totalPages");
  if (pageNumber > resolvedTotalPages) {
    throw new Error(
      `pageNumber 超出范围：${String(pageNumber)}，总页数：${String(resolvedTotalPages)}`,
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
    bodyHeight,
    documentHeight,
    maxScrollTop,
    ratio,
    targetTop,
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

export const resolveHtmlTotalPages = (tabId: number): number => {
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  assignLlmIds(body, parseRequiredPositiveInteger(tabId, "tabId"));
  const markdown = convertPageContentToMarkdown({
    body,
    locateViewportCenter: false,
    pageNumber: 1,
    title: document.title || "",
    url: window.location.href || "",
  });
  return markdown.totalPages;
};

export const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};
