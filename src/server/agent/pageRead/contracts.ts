import type { ChunkAnchorWeight } from "../../../shared/index.ts";

export type PageReadResultArgs = {
  content: string;
  contentLabel: string;
  headerLines: string[];
  isInternal: boolean;
};

export type PageReadMetadata = {
  chunkAnchorWeights?: ChunkAnchorWeight[];
  pageNumber: number;
  totalPages: number;
  viewportPage: number;
};

export type PageMarkdownData = PageReadMetadata & {
  content: string;
  title: string;
  url: string;
};

export type ButtonTabChunkLocation = {
  pageNumber: number;
  tabId: number;
};

export type InputTabChunkLocation = {
  pageNumber: number;
  tabId: number;
};

export type FetchPageMarkdownDataOptions = {
  locateViewportCenter?: boolean;
};

export type ResolvePageImageInputOptions = {
  allowRemoteContentTypeProbe?: boolean;
};

export type PageReadMetadataInput = {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
};

export type PageHashSyncData = {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
};
