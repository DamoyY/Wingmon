import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";
import { cloneBodyWithShadowDom, resolveRenderedText } from "./shadowDom.ts";
import createTurndownService from "./turndownService.js";
import { markViewportCenter, sliceContentAroundMarker } from "./viewport.js";

type PageContentData = {
  body?: HTMLElement | null;
  title?: string;
  url?: string;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
};

type TurndownService = {
  turndown: (input: string) => string;
};

type MarkViewportCenter = (root: HTMLElement) => string;
type SliceContentAroundMarker = (
  content: string,
  markerToken: string,
) => string;
type CreateTurndownService = () => TurndownService;

const createTurndownServiceTyped =
  createTurndownService as CreateTurndownService;
const turndown = createTurndownServiceTyped();
const markViewportCenterTyped = markViewportCenter as MarkViewportCenter;
const sliceContentAroundMarkerTyped =
  sliceContentAroundMarker as SliceContentAroundMarker;

const resolveTextFallback = (
  body: HTMLElement,
  htmlContent: string,
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
    console.warn("页面 HTML 提取内容偏少，已改用渲染文本", {
      htmlLength: htmlTrimmed.length,
      textLength: textTrimmed.length,
    });
    return textTrimmed;
  }
  return htmlContent;
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
  const markerToken = markViewportCenterTyped(bodyClone),
    content = turndown.turndown(bodyClone.innerHTML),
    sliced = sliceContentAroundMarkerTyped(content, markerToken),
    resolvedContent = resolveTextFallback(pageData.body, sliced);
  return {
    title: pageData.title ?? "",
    url: pageData.url ?? "",
    content: resolvedContent,
  };
};

export default convertPageContentToMarkdown;
