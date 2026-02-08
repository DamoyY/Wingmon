import {
  type ChunkAnchorPoint,
  extractControlMarkers,
  insertChunkAnchorMarkers,
  markViewportCenter,
} from "./controlMarkers.ts";
import {
  type PrefixTokenCounter,
  chunkMarkdownContent,
} from "./markdownChunking.ts";
import { cloneBodyWithShadowDom, resolveRenderedText } from "./shadowDom.ts";
import type { MarkdownChunkResult } from "../../shared/index.ts";
import type { PageNumberInput } from "../common/index.ts";
import createTurndownService from "./turndownService.ts";
import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";
import { resolveViewportPage } from "./viewportPage.ts";

export type PageContentData = {
  body?: HTMLElement | null;
  title?: string;
  url?: string;
  pageNumber?: PageNumberInput;
};

export type PreparedMarkdownPageContent = {
  title: string;
  url: string;
  chunked: MarkdownChunkResult;
  viewportPage: number;
  anchors: ChunkAnchorPoint[];
  prefixTokenCounter: PrefixTokenCounter;
};

type TurndownService = {
  turndown: (input: string) => string;
};

type CreateTurndownService = () => TurndownService;

const createTurndownServiceTyped =
  createTurndownService as CreateTurndownService;
const turndown = createTurndownServiceTyped();

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

const prepareMarkdownPageContent = (
  pageData: PageContentData | null = null,
): PreparedMarkdownPageContent => {
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
    { chunked, prefixTokenCounter } = chunkMarkdownContent(content),
    viewportPage = resolveViewportPage(
      viewportIndex,
      chunked,
      prefixTokenCounter,
    );
  return {
    anchors,
    chunked,
    prefixTokenCounter,
    title: pageData.title ?? "",
    url: pageData.url ?? "",
    viewportPage,
  };
};

export { prepareMarkdownPageContent };
