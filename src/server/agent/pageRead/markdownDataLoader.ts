import type { GetPageContentSuccessResponse } from "../../../shared/index.ts";
import {
  getTabNavigationFailure,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.ts";
import type {
  FetchPageMarkdownDataOptions,
  PageMarkdownData,
} from "./contracts.ts";
import {
  resolveButtonChunkPages,
  resolveInputChunkPages,
  updateButtonChunkIndexForTab,
  updateInputChunkIndexForTab,
} from "./controlChunkIndex.ts";
import { buildPageContentMessage } from "./messageBuilders.ts";
import { normalizePageReadFailure, resolvePageMetadata } from "./metadata.ts";

const pageContentRetryBaseDelayMs = 200,
  pageContentRetryTimeoutMs = 10000,
  contentScriptMissingReceiverPattern = /Receiving end does not exist/u,
  resolvePageContentRetryDelay = (attempt: number) =>
    pageContentRetryBaseDelayMs * 2 ** attempt,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
  options: FetchPageMarkdownDataOptions = {},
): Promise<PageMarkdownData> => {
  const shouldRetry = await waitForContentScript(tabId),
    fetchOnce = async () => {
      const pageData: GetPageContentSuccessResponse = await sendMessageToTab(
        tabId,
        buildPageContentMessage(tabId, pageNumber, options),
      );
      const metadata = resolvePageMetadata(pageData, pageNumber);
      const buttonChunkPages = resolveButtonChunkPages(pageData, metadata),
        inputChunkPages = resolveInputChunkPages(pageData, metadata);
      updateButtonChunkIndexForTab(tabId, buttonChunkPages);
      updateInputChunkIndexForTab(tabId, inputChunkPages);
      return {
        content: pageData.content,
        title: pageData.title,
        url: pageData.url,
        ...metadata,
      };
    },
    startTime = Date.now();
  let attemptIndex = 0;
  for (;;) {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure = normalizePageReadFailure(error),
        navigationFailure = getTabNavigationFailure(tabId),
        shouldReplaceWithNavigationFailure =
          navigationFailure !== null &&
          contentScriptMissingReceiverPattern.test(failure.message);
      if (shouldReplaceWithNavigationFailure) {
        const normalizedFailure = new Error(navigationFailure.error);
        console.error(
          `页面内容获取失败：${normalizedFailure.message}`,
          normalizedFailure,
          navigationFailure,
        );
        throw normalizedFailure;
      }
      const failureMessage = `页面内容获取失败：${failure.message}`;
      if (!shouldRetry) {
        console.error(failureMessage, failure);
        throw failure;
      }
      const elapsedMs = Date.now() - startTime,
        delayMs = resolvePageContentRetryDelay(attemptIndex),
        attemptsMade = attemptIndex + 1,
        retryWarningMessage = `第${String(attemptsMade)}次获取页面内容获取失败：${failure.message}`;
      console.warn(retryWarningMessage, failure);
      if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
        console.warn(failureMessage, failure);
        throw failure;
      }
      await waitForDelay(delayMs);
      attemptIndex += 1;
    }
  }
};
