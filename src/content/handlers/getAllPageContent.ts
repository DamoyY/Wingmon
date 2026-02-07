import {
  type GetAllPageContentRequest,
  type GetAllPageContentResponse,
} from "../../shared/index.ts";
import { convertPageContentToMarkdownPages } from "../extractors/converter.js";
import { convertPdfToMarkdownPages } from "../extractors/pdfConverter.js";
import { isPdfDocument } from "../common/index.ts";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: GetAllPageContentResponse) => void;

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
    const markdown = withPreparedBody((body) => {
      return convertPageContentToMarkdownPages({
        body,
        title,
        url,
      });
    });
    sendResponse({
      title: markdown.title,
      url: markdown.url,
      totalPages: markdown.totalPages,
      pages: markdown.pages,
    });
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面内容读取失败",
    );
  }
};

export default handleGetAllPageContent;
