import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";
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

const convertPageContentToMarkdown = (
  pageData?: PageContentData | null,
): MarkdownPageContent => {
  if (!pageData?.body) {
    throw new Error("页面内容为空");
  }
  const bodyClone = pageData.body.cloneNode(true) as HTMLElement;
  replaceButtons(bodyClone);
  replaceInputs(bodyClone);
  const markerToken = markViewportCenterTyped(bodyClone),
    content = turndown.turndown(bodyClone.innerHTML),
    sliced = sliceContentAroundMarkerTyped(content, markerToken);
  return {
    title: pageData.title ?? "",
    url: pageData.url ?? "",
    content: sliced,
  };
};

export default convertPageContentToMarkdown;
