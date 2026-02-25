import type {
  ButtonChunkPage,
  ChunkAnchorWeight,
  InputChunkPage,
} from "../../shared/index.ts";
import {
  createButtonControlMarkerPattern,
  createInputControlMarkerPattern,
} from "../../shared/index.ts";
import {
  type PageContentRequest,
  normalizePageContentRequest,
} from "./pageContentContracts.ts";
import { prepareMarkdownPageContent } from "./pageMarkdownPreparation.ts";
import { resolveChunkAnchorWeightsOrThrow } from "./chunkAnchorWeights.ts";
import { resolvePageNumberInput } from "../common/index.ts";

type MarkdownPageContent = {
  buttonChunkPages: ButtonChunkPage[];
  chunkAnchorWeights: ChunkAnchorWeight[];
  content: string;
  inputChunkPages: InputChunkPage[];
  pageNumber: number;
  title: string;
  totalPages: number;
  totalTokens: number;
  url: string;
  viewportPage: number;
};

export type MarkdownPageChunk = {
  content: string;
  pageNumber: number;
};

export type MarkdownPageContentCollection = {
  pages: MarkdownPageChunk[];
  title: string;
  totalPages: number;
  totalTokens: number;
  url: string;
  viewportPage: number;
};

type ButtonChunkLookupSnapshot = {
  idToPageNumber: Map<string, number>;
  url: string;
};

type ControlChunkPage = {
  id: string;
  pageNumber: number;
};

const buttonControlMarkerPattern = createButtonControlMarkerPattern();
const inputControlMarkerPattern = createInputControlMarkerPattern();

let latestButtonChunkLookupSnapshot: ButtonChunkLookupSnapshot | null = null;

const normalizeSnapshotUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return parsed.toString();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "按钮分片记录 URL 解析失败";
    console.error("按钮分片记录 URL 解析失败", {
      errorMessage,
      url: trimmed,
    });
    return trimmed;
  }
};

const buildControlChunkPageMap = (
  pages: readonly MarkdownPageChunk[],
  markerPattern: RegExp,
  controlName: string,
): Map<string, number> => {
  const idToPageNumber = new Map<string, number>();
  pages.forEach((page) => {
    if (!Number.isInteger(page.pageNumber) || page.pageNumber <= 0) {
      throw new Error(`${controlName}分片记录页码无效`);
    }
    if (typeof page.content !== "string") {
      throw new Error(`${controlName}分片记录内容无效`);
    }
    markerPattern.lastIndex = 0;
    let markerMatch = markerPattern.exec(page.content);
    while (markerMatch) {
      const markerId = markerMatch[1];
      if (typeof markerId !== "string" || !markerId.trim()) {
        throw new Error(`${controlName}分片标记缺少 id`);
      }
      const normalizedId = markerId.trim().toLowerCase();
      const existingPageNumber = idToPageNumber.get(normalizedId);
      if (
        existingPageNumber !== undefined &&
        existingPageNumber !== page.pageNumber
      ) {
        throw new Error(`${controlName}分片记录冲突：${normalizedId}`);
      }
      idToPageNumber.set(normalizedId, page.pageNumber);
      markerMatch = markerPattern.exec(page.content);
    }
  });
  return idToPageNumber;
};

const overwriteButtonChunkLookupSnapshot = (
  url: string,
  pages: readonly MarkdownPageChunk[],
): Map<string, number> => {
  const idToPageNumber = buildControlChunkPageMap(
    pages,
    buttonControlMarkerPattern,
    "按钮",
  );
  latestButtonChunkLookupSnapshot = {
    idToPageNumber,
    url: normalizeSnapshotUrl(url),
  };
  return idToPageNumber;
};

const serializeControlChunkPages = (
  idToPageNumber: ReadonlyMap<string, number>,
): ControlChunkPage[] => {
  return Array.from(idToPageNumber.entries())
    .map(([id, pageNumber]) => ({ id, pageNumber }))
    .sort((left, right) => {
      if (left.pageNumber !== right.pageNumber) {
        return left.pageNumber - right.pageNumber;
      }
      return left.id.localeCompare(right.id);
    });
};

export const resolveButtonChunkPageNumberFromSnapshot = (
  id: string,
  url: string,
): number | null => {
  const snapshot = latestButtonChunkLookupSnapshot;
  if (!snapshot) {
    return null;
  }
  if (snapshot.url !== normalizeSnapshotUrl(url)) {
    return null;
  }
  const normalizedId = id.trim().toLowerCase();
  if (!normalizedId) {
    throw new Error("按钮分片记录查询 id 为空");
  }
  const pageNumber = snapshot.idToPageNumber.get(normalizedId);
  if (pageNumber === undefined) {
    return null;
  }
  if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
    throw new Error("按钮分片记录页码无效");
  }
  return pageNumber;
};

export const invalidateButtonChunkPageSnapshot = (url: string): void => {
  const snapshot = latestButtonChunkLookupSnapshot;
  if (!snapshot) {
    return;
  }
  if (snapshot.url !== normalizeSnapshotUrl(url)) {
    return;
  }
  latestButtonChunkLookupSnapshot = null;
};

export const convertPageContentToMarkdownPages = (
  pageData: PageContentRequest,
): MarkdownPageContentCollection => {
  const normalizedPageData = normalizePageContentRequest(pageData);
  const prepared = prepareMarkdownPageContent(normalizedPageData);
  const pages = prepared.chunked.chunks.map((content, index) => ({
    content,
    pageNumber: index + 1,
  }));
  overwriteButtonChunkLookupSnapshot(normalizedPageData.url, pages);
  return {
    pages,
    title: prepared.title,
    totalPages: prepared.chunked.totalPages,
    totalTokens: prepared.chunked.totalTokens,
    url: prepared.url,
    viewportPage: prepared.viewportPage,
  };
};

const convertPageContentToMarkdown = (
  pageData: PageContentRequest,
): MarkdownPageContent => {
  const normalizedPageData = normalizePageContentRequest(pageData);
  const prepared = prepareMarkdownPageContent(normalizedPageData);
  const pages = prepared.chunked.chunks.map((content, index) => ({
    content,
    pageNumber: index + 1,
  }));
  const buttonChunkPageMap = overwriteButtonChunkLookupSnapshot(
    normalizedPageData.url,
    pages,
  );
  const inputChunkPageMap = buildControlChunkPageMap(
    pages,
    inputControlMarkerPattern,
    "输入框",
  );
  const pageNumber = resolvePageNumberInput(normalizedPageData.pageNumber);
  if (pageNumber > prepared.chunked.totalPages) {
    throw new Error(
      `pageNumber 超出范围：${String(pageNumber)}，总页数：${String(prepared.chunked.totalPages)}`,
    );
  }
  const chunkAnchorWeights = resolveChunkAnchorWeightsOrThrow(
      prepared.anchors,
      prepared.chunked.boundaries,
      pageNumber,
      prepared.prefixTokenCounter,
    ),
    pageChunk = prepared.chunked.chunks[pageNumber - 1];
  if (typeof pageChunk !== "string") {
    throw new Error("分片内容缺失");
  }
  return {
    buttonChunkPages: serializeControlChunkPages(buttonChunkPageMap),
    chunkAnchorWeights,
    content: pageChunk,
    inputChunkPages: serializeControlChunkPages(inputChunkPageMap),
    pageNumber,
    title: prepared.title,
    totalPages: prepared.chunked.totalPages,
    totalTokens: prepared.chunked.totalTokens,
    url: prepared.url,
    viewportPage: prepared.viewportPage,
  };
};

export default convertPageContentToMarkdown;
