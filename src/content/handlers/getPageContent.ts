import { isPdfUrl } from "../../shared/index.ts";
import {
  assignChunkAnchors,
  assignLlmIds,
  insertViewportMarker,
} from "../dom/index.js";
import convertPageContentToMarkdown from "../markdown/converter.js";
import convertPdfToMarkdown from "../markdown/pdfConverter.js";

type PageNumberInput = number | string | null;

type PageContentResponse = {
  title?: string;
  url?: string;
  content?: string;
  totalPages?: number;
  pageNumber?: number;
  viewportPage?: number;
  chunkAnchorId?: string;
  totalTokens?: number;
  error?: string;
};

type SendResponse = (response: PageContentResponse) => void;

type PageContentMessage = {
  pageNumber?: PageNumberInput;
  page_number?: PageNumberInput;
};

const isPdfContentType = (): boolean => {
  return document.contentType.toLowerCase().includes("pdf");
};

const hasPdfEmbed = (): boolean => {
  const body = document.querySelector("body");
  if (!body) {
    return false;
  }
  return Boolean(
    body.querySelector(
      "embed[type='application/pdf'], object[type='application/pdf']",
    ),
  );
};

const isPdfDocument = (): boolean => {
  const url = window.location.href || "";
  return isPdfContentType() || hasPdfEmbed() || (url ? isPdfUrl(url) : false);
};

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolvePageNumber = (value: PageNumberInput): number => {
  if (value === null) {
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

const resolveMessagePageNumber = (message: PageContentMessage): number => {
  const hasCamel = "pageNumber" in message,
    hasSnake = "page_number" in message;
  if (hasCamel && hasSnake) {
    const camelValue = resolvePageNumber(message.pageNumber ?? null),
      snakeValue = resolvePageNumber(message.page_number ?? null);
    if (camelValue !== snakeValue) {
      throw new Error("pageNumber 与 page_number 不一致");
    }
    return camelValue;
  }
  if (hasCamel) {
    return resolvePageNumber(message.pageNumber ?? null);
  }
  if (hasSnake) {
    return resolvePageNumber(message.page_number ?? null);
  }
  return 1;
};

const handleGetPageContent = async (
  message: PageContentMessage,
  sendResponse: SendResponse,
): Promise<void> => {
  try {
    const title = document.title || "",
      url = window.location.href || "",
      pageNumber = resolveMessagePageNumber(message);
    if (isPdfDocument()) {
      const markdown = await convertPdfToMarkdown({ title, url, pageNumber });
      sendResponse(markdown);
      return;
    }
    const body = document.querySelector("body");
    if (!body) {
      sendResponse({ error: "页面没有可用的 body" });
      return;
    }
    let marker: HTMLSpanElement | null = null;
    try {
      marker = insertViewportMarker(body);
      assignChunkAnchors(body);
      assignLlmIds(body);
      const markdown = convertPageContentToMarkdown({
        body,
        title,
        url,
        pageNumber,
      });
      sendResponse(markdown);
    } finally {
      if (marker?.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面内容读取失败",
    );
  }
};

export default handleGetPageContent;
