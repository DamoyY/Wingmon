import {
  type GetPageContentRequest,
  type SetPageHashRequest,
} from "../../../shared/index.ts";
import type {
  FetchPageMarkdownDataOptions,
  PageHashSyncData,
} from "./contracts.ts";
import { resolvePageMetadata, resolvePageNumber } from "./metadata.ts";

export const buildPageContentMessage = (
  tabId: number,
  pageNumber: number | undefined,
  options: FetchPageMarkdownDataOptions,
): GetPageContentRequest => {
  const message: GetPageContentRequest = { tabId, type: "getPageContent" };
  if (pageNumber !== undefined) {
    message.pageNumber = resolvePageNumber(pageNumber);
  }
  if (options.locateViewportCenter === true) {
    message.locateViewportCenter = true;
  }
  return message;
};

export const buildPageHashMessage = (
  tabId: number,
  pageData?: PageHashSyncData,
): SetPageHashRequest => {
  const metadata = resolvePageMetadata(pageData ?? {});
  const message: SetPageHashRequest = {
    tabId,
    type: "setPageHash",
  };
  if (metadata.chunkAnchorWeights !== undefined) {
    message.chunkAnchorWeights = metadata.chunkAnchorWeights;
  }
  message.pageNumber = metadata.pageNumber;
  message.totalPages = metadata.totalPages;
  return message;
};
