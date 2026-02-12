import {
  type GetPageContentRequest,
  type GetPageContentResponse,
  parseRequiredPositiveInteger,
} from "../../shared/index.ts";
import { isPdfDocument, resolvePageNumberInput } from "../common/index.ts";
import convertPageContentToMarkdown from "../extractors/converter.js";
import convertPdfToMarkdown from "../extractors/pdfConverter.js";
import resolveSiteProfileContent from "../siteProfiles/index.js";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: GetPageContentResponse) => void;

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolveMessagePageNumber = (message: GetPageContentRequest): number => {
  return resolvePageNumberInput(message.pageNumber ?? null, "pageNumber");
};

const resolveLocateViewportCenter = (
  message: GetPageContentRequest,
): boolean => {
  return message.locateViewportCenter === true;
};

const handleGetPageContent = async (
  message: GetPageContentRequest,
  sendResponse: SendResponse,
): Promise<void> => {
  try {
    const title = document.title || "",
      url = window.location.href || "",
      pageNumber = resolveMessagePageNumber(message),
      locateViewportCenter = resolveLocateViewportCenter(message),
      tabId = parseRequiredPositiveInteger(message.tabId, "tabId");
    if (isPdfDocument()) {
      const markdown = await convertPdfToMarkdown({ pageNumber, title, url });
      sendResponse(markdown);
      return;
    }
    const siteProfileContent = resolveSiteProfileContent({
      pageNumber,
      title,
      url,
    });
    if (siteProfileContent !== null) {
      sendResponse(siteProfileContent);
      return;
    }
    const markdown = withPreparedBody(
      (body) => {
        return convertPageContentToMarkdown({
          body,
          locateViewportCenter,
          pageNumber,
          title,
          url,
        });
      },
      { includeViewportMarker: locateViewportCenter, tabId },
    );
    sendResponse(markdown);
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面内容读取失败",
    );
  }
};

export default handleGetPageContent;
