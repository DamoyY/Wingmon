import {
  type PageContentRequest,
  normalizePageContentRequest,
} from "./pageContentContracts.ts";
import type { ChunkAnchorWeight } from "../../shared/index.ts";
import { prepareMarkdownPageContent } from "./pageMarkdownPreparation.ts";
import { resolveChunkAnchorWeightsOrThrow } from "./chunkAnchorWeights.ts";
import { resolvePageNumberInput } from "../common/index.ts";

type MarkdownPageContent = {
  chunkAnchorWeights: ChunkAnchorWeight[];
  content: string;
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

export const convertPageContentToMarkdownPages = (
  pageData: PageContentRequest,
): MarkdownPageContentCollection => {
  const normalizedPageData = normalizePageContentRequest(pageData);
  const prepared = prepareMarkdownPageContent(normalizedPageData);
  return {
    pages: prepared.chunked.chunks.map((content, index) => ({
      content,
      pageNumber: index + 1,
    })),
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
    chunkAnchorWeights,
    content: pageChunk,
    pageNumber,
    title: prepared.title,
    totalPages: prepared.chunked.totalPages,
    totalTokens: prepared.chunked.totalTokens,
    url: prepared.url,
    viewportPage: prepared.viewportPage,
  };
};

export default convertPageContentToMarkdown;
