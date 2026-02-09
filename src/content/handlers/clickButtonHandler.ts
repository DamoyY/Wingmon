import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../shared/index.ts";
import { isPdfDocument, normalizeLlmId } from "../common/index.ts";
import { convertPageContentToMarkdownPages } from "../extractors/converter.js";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: ClickButtonResponse) => void;
const domStableDelayMs = 500,
  domStableMaxDelayMs = 5000,
  findSingleButton = (normalizedId: string): HTMLElement | null => {
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
  waitForDomStability = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      const root = document.documentElement;
      let finished = false;
      let maxDelayTimer: number | null = null;
      let stableTimer: number | null = null;
      const cleanup = (observer: MutationObserver): void => {
          observer.disconnect();
          if (stableTimer !== null) {
            window.clearTimeout(stableTimer);
            stableTimer = null;
          }
          if (maxDelayTimer !== null) {
            window.clearTimeout(maxDelayTimer);
            maxDelayTimer = null;
          }
        },
        complete = (observer: MutationObserver): void => {
          if (finished) {
            return;
          }
          finished = true;
          cleanup(observer);
          resolve();
        },
        resetStableTimer = (observer: MutationObserver): void => {
          if (stableTimer !== null) {
            window.clearTimeout(stableTimer);
          }
          stableTimer = window.setTimeout(() => {
            complete(observer);
          }, domStableDelayMs);
        };
      const observer = new MutationObserver(() => {
        resetStableTimer(observer);
      });
      try {
        observer.observe(root, {
          attributes: true,
          characterData: true,
          childList: true,
          subtree: true,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "点击后监听 DOM 变化失败";
        console.error(errorMessage);
        cleanup(observer);
        resolve();
        return;
      }
      maxDelayTimer = window.setTimeout(() => {
        complete(observer);
      }, domStableMaxDelayMs);
      resetStableTimer(observer);
    });
  },
  handleClickButton = async (
    message: ClickButtonRequest,
    sendResponse: SendResponse,
  ): Promise<void> => {
    const normalizedId = normalizeLlmId(message.id ?? null),
      target = findSingleButton(normalizedId);
    if (!target) {
      sendResponse({ ok: false, reason: "not_found" });
      return;
    }
    const pageNumber = resolveButtonChunkPageNumber(normalizedId);
    target.click();
    await waitForDomStability();
    if (pageNumber === null) {
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: true, pageNumber });
  };

export default handleClickButton;
