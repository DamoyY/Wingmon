import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import convertPageContentToMarkdown from "../markdown/converter.js";
import convertPdfToMarkdown from "../markdown/pdfConverter.js";

type PageContentResponse = {
  title?: string;
  url?: string;
  content?: string;
  error?: string;
};

type SendResponse = (response: PageContentResponse) => void;

const isPdfContentType = (): boolean => {
  return document.contentType.toLowerCase().includes("pdf");
};

const isPdfUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".pdf");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PDF 地址解析失败：${message}`);
    return false;
  }
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

const sendError = (sendResponse: SendResponse, error: unknown): void => {
  const message = error instanceof Error ? error.message : "页面内容读取失败";
  console.error(message);
  sendResponse({ error: message });
};

const handleGetPageContent = async (
  sendResponse: SendResponse,
): Promise<void> => {
  try {
    const title = document.title || "",
      url = window.location.href || "";
    if (isPdfDocument()) {
      const markdown = await convertPdfToMarkdown({ title, url });
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
      assignLlmIds(body);
      const markdown = convertPageContentToMarkdown({
        body,
        title,
        url,
      });
      sendResponse(markdown);
    } finally {
      if (marker?.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }
  } catch (error) {
    sendError(sendResponse, error);
  }
};

export default handleGetPageContent;
