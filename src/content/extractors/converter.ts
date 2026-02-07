import type { ChunkAnchorWeight } from "../../shared/index.ts";
import { resolvePageNumberInput } from "../common/index.ts";
import {
  prepareMarkdownPageContent,
  type PageContentData,
} from "./pageMarkdownPreparation.ts";
import { resolveChunkAnchorWeightsOrThrow } from "./chunkAnchorWeights.ts";

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
  totalPages: number;
  pageNumber: number;
  viewportPage: number;
  chunkAnchorWeights: ChunkAnchorWeight[];
  totalTokens: number;
};

export type MarkdownPageChunk = {
  pageNumber: number;
  content: string;
};

export type MarkdownPageContentCollection = {
  title: string;
  url: string;
  totalPages: number;
  viewportPage: number;
  pages: MarkdownPageChunk[];
  totalTokens: number;
};

export const convertPageContentToMarkdownPages = (
  pageData: PageContentData | null = null,
): MarkdownPageContentCollection => {
  const prepared = prepareMarkdownPageContent(pageData);
  return {
    title: prepared.title,
    url: prepared.url,
    totalPages: prepared.chunked.totalPages,
    viewportPage: prepared.viewportPage,
    pages: prepared.chunked.chunks.map((content, index) => ({
      pageNumber: index + 1,
      content,
    })),
    totalTokens: prepared.chunked.totalTokens,
  };
};

const convertPageContentToMarkdown = (
  pageData: PageContentData | null = null,
): MarkdownPageContent => {
  const prepared = prepareMarkdownPageContent(pageData);
  const pageNumber = resolvePageNumberInput(pageData?.pageNumber ?? null);
  if (pageNumber > prepared.chunked.totalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(prepared.chunked.totalPages)}`,
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
    title: prepared.title,
    url: prepared.url,
    content: pageChunk,
    totalPages: prepared.chunked.totalPages,
    pageNumber,
    viewportPage: prepared.viewportPage,
    chunkAnchorWeights,
    totalTokens: prepared.chunked.totalTokens,
  };
};

export default convertPageContentToMarkdown;
