type SetPageHashMessage = {
  pageNumber?: number;
};

type SetPageHashResponse = {
  ok?: boolean;
  skipped?: boolean;
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

const isHtmlDocument = (): boolean => {
  const contentType = document.contentType || "";
  return contentType.toLowerCase().includes("html");
};

const sendError = (sendResponse: SendResponse, error: unknown): void => {
  const message = error instanceof Error ? error.message : "页面跳转失败";
  console.error(message);
  sendResponse({ error: message });
};

const handleSetPageHash = (
  message: SetPageHashMessage,
  sendResponse: SendResponse,
): void => {
  try {
    if (isHtmlDocument()) {
      sendResponse({ ok: true, skipped: true });
      return;
    }
    const pageNumber = resolvePageNumber(message.pageNumber);
    window.location.hash = `page=${String(pageNumber)}`;
    sendResponse({ ok: true });
  } catch (error) {
    sendError(sendResponse, error);
  }
};

export default handleSetPageHash;
