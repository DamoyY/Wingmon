import {
  type ControlMarkerExtraction,
  extractControlMarkers,
  normalizeControlMarkersForMarkdown,
} from "./controlMarkers.ts";
import type { PreparedDomStage } from "./domPreparationStage.ts";
import createTurndownService from "./turndownService.ts";
import { resolveRenderedText } from "./shadowDom.ts";

type TurndownService = { turndown: (input: string) => string };
type CreateTurndownService = () => TurndownService;

const createTurndownServiceTyped =
  createTurndownService as CreateTurndownService;
const turndown = createTurndownServiceTyped();

const resolveTextFallback = (
  body: HTMLElement,
  markdownContent: string,
  markerToken: string | null,
): string => {
  const viewportMarkerToken =
    typeof markerToken === "string" && markerToken.length > 0
      ? markerToken
      : null;
  const fallbackText = resolveRenderedText(body);
  const markdownTrimmed = markdownContent.trim();
  const textTrimmed = fallbackText.trim();
  if (!textTrimmed) {
    return markdownContent;
  }
  if (!markdownTrimmed) {
    console.warn("页面 HTML 提取为空，已改用渲染文本");
    return textTrimmed;
  }
  if (
    textTrimmed.length > markdownTrimmed.length * 2 &&
    textTrimmed.length - markdownTrimmed.length > 200
  ) {
    if (
      viewportMarkerToken !== null &&
      markdownContent.includes(viewportMarkerToken) &&
      !textTrimmed.includes(viewportMarkerToken)
    ) {
      console.warn("页面渲染文本回退会丢失视口标记，继续使用 Markdown 内容");
      return markdownContent;
    }
    console.warn("页面 HTML 提取内容偏少，已改用渲染文本", {
      htmlLength: markdownTrimmed.length,
      textLength: textTrimmed.length,
    });
    return textTrimmed;
  }
  return markdownContent;
};

const transformDomStageToMarkdown = (
  preparedDom: PreparedDomStage,
): ControlMarkerExtraction => {
  const markdownWithMarkers = turndown.turndown(
    preparedDom.transformedBody.innerHTML,
  );
  const resolvedContentWithMarkers = resolveTextFallback(
    preparedDom.sourceBody,
    markdownWithMarkers,
    preparedDom.markerToken,
  );
  const normalizedContentWithMarkers = normalizeControlMarkersForMarkdown(
    resolvedContentWithMarkers,
  );
  return extractControlMarkers(
    normalizedContentWithMarkers,
    preparedDom.markerToken,
  );
};

export { transformDomStageToMarkdown };
