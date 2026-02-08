import {
  type GetPageContentRequest,
  type GetPageContentResponse,
} from "../../shared/index.ts";
import {
  isPdfDocument,
  resolveAliasedPageNumberInput,
} from "../common/index.ts";
import convertPageContentToMarkdown from "../extractors/converter.js";
import convertPdfToMarkdown from "../extractors/pdfConverter.js";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: GetPageContentResponse) => void;

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolveMessagePageNumber = (message: GetPageContentRequest): number => {
  return resolveAliasedPageNumberInput({
    camelProvided: "pageNumber" in message,
    camelValue: message.pageNumber ?? null,
    defaultValue: 1,
    mismatchMessage: "pageNumber 与 page_number 不一致",
    snakeProvided: "page_number" in message,
    snakeValue: message.page_number ?? null,
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
      const markdown = await convertPdfToMarkdown({ pageNumber, title, url });
      sendResponse(markdown);
      return;
    }
    const markdown = withPreparedBody((body) => {
      return convertPageContentToMarkdown({
        body,
        pageNumber,
        title,
        url,
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
