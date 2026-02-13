import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../shared/index.ts";
import {
  invalidateButtonChunkPageSnapshot,
  resolveButtonChunkPageNumberFromSnapshot,
} from "../extractors/converter.js";
import {
  isButtonElement,
  llmControlVisibilityOptions,
} from "../dom/editableElements.js";
import { isPdfDocument, normalizeLlmId } from "../common/index.ts";
import { isElementVisible } from "../dom/visibility.js";

type SendResponse = (response: ClickButtonResponse) => void;

const domStableDelayMs = 500;
const domStableMaxDelayMs = 5000;

const findSingleButton = (normalizedId: string): HTMLElement | null => {
  const win = document.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  const matches = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-llm-id="${normalizedId}"]`),
    ),
    buttonMatches = matches.filter((match) => {
      if (!isButtonElement(match)) {
        return false;
      }
      return isElementVisible(match, win, llmControlVisibilityOptions);
    });
  if (!buttonMatches.length) {
    return null;
  }
  if (buttonMatches.length > 1) {
    throw new Error(`找到多个 id 为 ${normalizedId} 的按钮`);
  }
  return buttonMatches[0];
};

const resolveButtonChunkPageNumber = (
  normalizedId: string,
  url: string,
): number | null => {
  if (isPdfDocument()) {
    return 1;
  }
  try {
    const pageNumber = resolveButtonChunkPageNumberFromSnapshot(
      normalizedId,
      url,
    );
    if (pageNumber === null) {
      console.error("按钮分片定位失败，按钮分片记录不存在", {
        id: normalizedId,
        url,
      });
      return null;
    }
    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      throw new Error("按钮分片页码无效");
    }
    return pageNumber;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "按钮分片定位发生未知异常";
    console.error("按钮分片定位失败", { errorMessage, id: normalizedId });
    return null;
  }
};

export const waitForDomStability = (): Promise<void> => {
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
};

const handleClickButton = async (
  message: ClickButtonRequest,
  sendResponse: SendResponse,
): Promise<void> => {
  const normalizedId = normalizeLlmId(message.id),
    target = findSingleButton(normalizedId);
  if (!target) {
    sendResponse({ ok: false, reason: "not_found" });
    return;
  }
  const url = window.location.href || "";
  const pageNumber = resolveButtonChunkPageNumber(normalizedId, url);
  target.click();
  await waitForDomStability();
  invalidateButtonChunkPageSnapshot(url);
  if (pageNumber === null) {
    sendResponse({ ok: true });
    return;
  }
  sendResponse({ ok: true, pageNumber });
};

export default handleClickButton;
