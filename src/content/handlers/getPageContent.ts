import {
  isPdfUrl,
  type GetPageContentRequest,
  type GetPageContentResponse,
} from "../../shared/index.ts";
import {
  assignChunkAnchors,
  assignLlmIds,
  insertViewportMarker,
} from "../dom/index.js";
import convertPageContentToMarkdown from "../markdown/converter.js";
import convertPdfToMarkdown from "../markdown/pdfConverter.js";
import { resolveAliasedPageNumberInput } from "../shared/index.ts";

type SendResponse = (response: GetPageContentResponse) => void;

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

const resolveMessagePageNumber = (message: GetPageContentRequest): number => {
  return resolveAliasedPageNumberInput({
    camelProvided: "pageNumber" in message,
    snakeProvided: "page_number" in message,
    camelValue: message.pageNumber ?? null,
    snakeValue: message.page_number ?? null,
    mismatchMessage: "pageNumber 与 page_number 不一致",
    defaultValue: 1,
  });
};

const handleGetPageContent = async (
  message: GetPageContentRequest,
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
