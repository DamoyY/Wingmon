import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import convertPageContentToMarkdown from "../markdown/converter.js";

type SetPageHashMessage = {
  pageNumber?: unknown;
  page_number?: unknown;
  totalPages?: unknown;
  total_pages?: unknown;
};

type SetPageHashResponse = {
  ok?: boolean;
  skipped?: boolean;
  shouldReload?: boolean;
  pageNumber?: number;
  totalPages?: number;
  error?: string;
};

type SendResponse = (response: SetPageHashResponse) => void;

const resolvePageNumber = (value: unknown): number => {
  if (value === undefined || value === null) {
    return 1;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error("page_number 必须是正整数");
};

const resolveMessagePageNumber = (message: SetPageHashMessage): number => {
  const hasCamel = message.pageNumber !== undefined,
    hasSnake = message.page_number !== undefined;
  if (hasCamel && hasSnake) {
    const camelValue = resolvePageNumber(message.pageNumber),
      snakeValue = resolvePageNumber(message.page_number);
    if (camelValue !== snakeValue) {
      throw new Error("pageNumber 与 page_number 不一致");
    }
    return camelValue;
  }
  if (hasCamel) {
    return resolvePageNumber(message.pageNumber);
  }
  if (hasSnake) {
    return resolvePageNumber(message.page_number);
  }
  return 1;
};

const resolveMessageTotalPages = (
  message: SetPageHashMessage,
): number | undefined => {
  const hasCamel = message.totalPages !== undefined,
    hasSnake = message.total_pages !== undefined;
  if (!hasCamel && !hasSnake) {
    return undefined;
  }
  if (hasCamel && hasSnake) {
    const camelValue = resolvePageNumber(message.totalPages),
      snakeValue = resolvePageNumber(message.total_pages);
    if (camelValue !== snakeValue) {
      throw new Error("totalPages 与 total_pages 不一致");
    }
    return camelValue;
  }
  return resolvePageNumber(hasCamel ? message.totalPages : message.total_pages);
};

const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};

const sendError = (sendResponse: SendResponse, error: unknown): void => {
  const message = error instanceof Error ? error.message : "页面跳转失败";
  console.error(message);
  sendResponse({ error: message });
};

const resolveHtmlTotalPages = (): number => {
  const body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  let marker: HTMLSpanElement | null = null;
  try {
    marker = insertViewportMarker(body);
    assignLlmIds(body);
    const markdown = convertPageContentToMarkdown({
      body,
      title: document.title || "",
      url: window.location.href || "",
      pageNumber: 1,
    });
    return markdown.totalPages;
  } finally {
    if (marker?.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};

const scrollHtmlByPage = (pageNumber: number, totalPages: number): void => {
  if (pageNumber > totalPages) {
    throw new Error(
      `page_number 超出范围：${String(pageNumber)}，总页数：${String(totalPages)}`,
    );
  }
  const ratio = (pageNumber - 0.5) / totalPages,
    body = document.querySelector("body");
  if (!body) {
    throw new Error("页面没有可用的 body");
  }
  const maxScrollTop =
      Math.max(document.documentElement.scrollHeight, body.scrollHeight) -
      window.innerHeight,
    targetTop = Math.max(0, maxScrollTop) * ratio;
  window.scrollTo({
    top: targetTop,
    behavior: "auto",
  });
};

const handleSetPageHash = (
  message: SetPageHashMessage,
  sendResponse: SendResponse,
): void => {
  try {
    const pageNumber = resolveMessagePageNumber(message);
    if (isHtmlDocument()) {
      const providedTotalPages = resolveMessageTotalPages(message),
        totalPages = providedTotalPages ?? resolveHtmlTotalPages();
      scrollHtmlByPage(pageNumber, totalPages);
      sendResponse({
        ok: true,
        shouldReload: false,
        pageNumber,
        totalPages,
      });
      return;
    }
    window.location.hash = `page=${String(pageNumber)}`;
    sendResponse({ ok: true, shouldReload: true, pageNumber });
  } catch (error) {
    sendError(sendResponse, error);
  }
};

export default handleSetPageHash;
