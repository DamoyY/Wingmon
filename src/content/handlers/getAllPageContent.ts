import {
  isPdfUrl,
  type GetAllPageContentRequest,
  type GetAllPageContentResponse,
} from "../../shared/index.ts";
import {
  assignChunkAnchors,
  assignLlmIds,
  insertViewportMarker,
} from "../dom/index.js";
import { convertPageContentToMarkdownPages } from "../extractors/converter.js";
import { convertPdfToMarkdownPages } from "../extractors/pdfConverter.js";

type SendResponse = (response: GetAllPageContentResponse) => void;

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

const handleGetAllPageContent = async (
  _message: GetAllPageContentRequest,
  sendResponse: SendResponse,
): Promise<void> => {
  try {
    const title = document.title || "",
      url = window.location.href || "";
    if (isPdfDocument()) {
      const markdown = await convertPdfToMarkdownPages({ title, url });
      sendResponse({
        title: markdown.title,
        url: markdown.url,
        totalPages: markdown.totalPages,
        pages: markdown.pages,
      });
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
      const markdown = convertPageContentToMarkdownPages({
        body,
        title,
        url,
      });
      sendResponse({
        title: markdown.title,
        url: markdown.url,
        totalPages: markdown.totalPages,
        pages: markdown.pages,
      });
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

export default handleGetAllPageContent;
