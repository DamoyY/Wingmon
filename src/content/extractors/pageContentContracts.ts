import type { ChunkAnchorPoint } from "./controlMarkers.ts";
import type { MarkdownChunkResult } from "../../shared/index.ts";
import type { PageNumberInput } from "../common/index.ts";
import type { PrefixTokenCounter } from "./markdownChunking.ts";

export type PageContentRequest = {
  body: HTMLElement;
  locateViewportCenter?: boolean;
  pageNumber?: PageNumberInput;
  title: string;
  url: string;
};

export type PageContentData = {
  body: HTMLElement;
  locateViewportCenter: boolean;
  pageNumber: PageNumberInput;
  title: string;
  url: string;
};

const resolveBodyField = (body: HTMLElement): HTMLElement => {
  if (!(body instanceof HTMLElement)) {
    throw new Error("页面内容为空");
  }
  return body;
};

const resolveTextField = (value: string, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} 必须是字符串`);
  }
  return value;
};

export const normalizePageContentRequest = (
  request: PageContentRequest,
): PageContentData => {
  return {
    body: resolveBodyField(request.body),
    locateViewportCenter: request.locateViewportCenter === true,
    pageNumber: request.pageNumber ?? null,
    title: resolveTextField(request.title, "title"),
    url: resolveTextField(request.url, "url"),
  };
};

export type PreparedMarkdownPageContent = {
  anchors: ChunkAnchorPoint[];
  chunked: MarkdownChunkResult;
  prefixTokenCounter: PrefixTokenCounter;
  title: string;
  url: string;
  viewportPage: number;
};
