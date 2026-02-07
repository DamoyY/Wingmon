import {
  type GetPageContentRequest,
  type GetPageContentResponse,
} from "../../shared/index.ts";
import convertPageContentToMarkdown from "../extractors/converter.js";
import convertPdfToMarkdown from "../extractors/pdfConverter.js";
import {
  isPdfDocument,
  resolveAliasedPageNumberInput,
} from "../shared/index.ts";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: GetPageContentResponse) => void;

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
    const markdown = withPreparedBody((body) => {
      return convertPageContentToMarkdown({
        body,
        title,
        url,
        pageNumber,
      });
    });
    sendResponse(markdown);
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面内容读取失败",
    );
  }
};

export default handleGetPageContent;
