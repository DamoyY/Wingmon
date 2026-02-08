import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../shared/index.ts";
import { isPdfDocument, normalizeLlmId } from "../common/index.ts";
import { convertPageContentToMarkdownPages } from "../extractors/converter.js";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: ClickButtonResponse) => void;
const findSingleButton = (normalizedId: string): HTMLElement | null => {
    const matches = document.querySelectorAll<HTMLElement>(
      `[data-llm-id="${normalizedId}"]`,
    );
    if (!matches.length) {
      return null;
    }
    if (matches.length > 1) {
      throw new Error(`找到多个 id 为 ${normalizedId} 的按钮`);
    }
    return matches[0];
  },
  resolveButtonChunkPageNumber = (normalizedId: string): number | null => {
    if (isPdfDocument()) {
      return 1;
    }
    const marker = `id: "${normalizedId}"`;
    try {
      const title = document.title || "",
        url = window.location.href || "",
        markdownPages = withPreparedBody((body) => {
          return convertPageContentToMarkdownPages({ body, title, url });
        }),
        matchedPage = markdownPages.pages.find((page) =>
          page.content.includes(marker),
        );
      if (!matchedPage) {
        console.error("按钮分片定位失败，未找到按钮标记", { id: normalizedId });
        return null;
      }
      if (
        !Number.isInteger(matchedPage.pageNumber) ||
        matchedPage.pageNumber <= 0
      ) {
        throw new Error("按钮分片页码无效");
      }
      return matchedPage.pageNumber;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "按钮分片定位发生未知异常";
      console.error("按钮分片定位失败", { errorMessage, id: normalizedId });
      return null;
    }
  },
  handleClickButton = (
    message: ClickButtonRequest,
    sendResponse: SendResponse,
  ): void => {
    const normalizedId = normalizeLlmId(message.id ?? null),
      target = findSingleButton(normalizedId);
    if (!target) {
      sendResponse({ error: `未找到 id 为 ${normalizedId} 的按钮` });
      return;
    }
    const pageNumber = resolveButtonChunkPageNumber(normalizedId);
    target.click();
    if (pageNumber === null) {
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: true, pageNumber });
  };

export default handleClickButton;
