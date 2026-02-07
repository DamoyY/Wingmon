import { t } from "../../lib/utils/index.ts";
import { buildPageReadResult } from "./pageReadHelpers.ts";
import type { ToolMessageContext, ToolPageReadEvent } from "./definitions.ts";
import type {
  ClickButtonToolResult,
  CloseBrowserPageToolResult,
  EnterTextToolResult,
  FindToolResult,
  GetPageMarkdownToolResult,
  OpenBrowserPageToolResult,
  PageReadToolResult,
} from "./toolResultTypes.ts";

type PageReadEventOptions = {
  requirePageNumber: boolean;
  skipInternal: boolean;
};

type NormalizedPageReadResult = {
  tabId: number;
  title: string;
  url: string;
  content: string;
  isInternal: boolean;
};

const resolvePositiveInteger = (value: number, fieldName: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} 必须是正整数`);
  }
  return value;
};

const resolveOptionalPositiveInteger = (
  value: number | undefined,
  fieldName: string,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return resolvePositiveInteger(value, fieldName);
};

const resolveString = (value: string, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} 必须是字符串`);
  }
  return value;
};

const resolveBoolean = (value: boolean, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} 必须是布尔值`);
  }
  return value;
};

const resolveOptionalTrimmedString = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
};

const resolvePageReadResult = (
  result: PageReadToolResult,
): NormalizedPageReadResult => ({
  tabId: resolvePositiveInteger(result.tabId, "Tab ID"),
  title: resolveString(result.title, "title"),
  url: resolveString(result.url, "url"),
  content: resolveString(result.content, "content"),
  isInternal: resolveBoolean(result.isInternal, "isInternal"),
});

const resolvePageChunk = (
  result: PageReadToolResult,
): { pageNumber: number; totalPages: number } => ({
  pageNumber: resolvePositiveInteger(result.pageNumber ?? 0, "pageNumber"),
  totalPages: resolvePositiveInteger(result.totalPages ?? 0, "totalPages"),
});

const buildPageReadEvent = (
  result: PageReadToolResult,
  options: PageReadEventOptions,
): ToolPageReadEvent | null => {
  const pageReadResult = resolvePageReadResult(result);
  if (options.skipInternal && pageReadResult.isInternal) {
    return null;
  }
  const pageReadEvent: ToolPageReadEvent = {
    tabId: pageReadResult.tabId,
  };
  const pageNumber = resolveOptionalPositiveInteger(
    result.pageNumber,
    "pageNumber",
  );
  if (options.requirePageNumber && pageNumber === undefined) {
    throw new Error("pageNumber 缺失");
  }
  if (pageNumber !== undefined) {
    pageReadEvent.pageNumber = pageNumber;
  }
  const url = resolveOptionalTrimmedString(pageReadResult.url);
  if (url !== undefined) {
    pageReadEvent.url = url;
  }
  return pageReadEvent;
};

const buildOptionalPageReadMessageContext = (
  result: PageReadToolResult,
  options: PageReadEventOptions,
): ToolMessageContext | null => {
  const pageReadEvent = buildPageReadEvent(result, options);
  if (pageReadEvent === null) {
    return null;
  }
  return { pageReadEvent };
};

const buildRequiredPageReadMessageContext = (
  result: PageReadToolResult,
  errorMessage: string,
): ToolMessageContext => {
  const pageReadEvent = buildPageReadEvent(result, {
    requirePageNumber: false,
    skipInternal: false,
  });
  if (pageReadEvent === null) {
    throw new Error(errorMessage);
  }
  return { pageReadEvent };
};

const buildInternalPageReadResult = (
  headerLines: string[],
  content: string,
): string =>
  buildPageReadResult({
    headerLines,
    contentLabel: "",
    content,
    isInternal: true,
  });

const buildChunkPageReadResult = (
  headerLines: string[],
  content: string,
  pageNumber: number,
  totalPages: number,
): string =>
  buildPageReadResult({
    headerLines: [
      ...headerLines,
      `${t("statusTotalChunks")}：`,
      String(totalPages),
    ],
    contentLabel: t("statusChunkContent", [String(pageNumber)]),
    content,
    isInternal: false,
  });

export const buildGetPageMarkdownMessageContext = (
  _args: unknown,
  result: GetPageMarkdownToolResult,
): ToolMessageContext | null => {
  return buildOptionalPageReadMessageContext(result, {
    requirePageNumber: true,
    skipInternal: true,
  });
};

export const buildOpenBrowserPageMessageContext = (
  _args: unknown,
  result: OpenBrowserPageToolResult,
): ToolMessageContext =>
  buildRequiredPageReadMessageContext(result, "open_page 缺少页面读取事件");

export const buildClickButtonMessageContext = (
  _args: unknown,
  result: ClickButtonToolResult,
): ToolMessageContext =>
  buildRequiredPageReadMessageContext(result, "click_button 缺少页面读取事件");

export const formatGetPageMarkdownResult = (
  result: GetPageMarkdownToolResult,
): string => {
  const { title, url, content, isInternal } = resolvePageReadResult(result);
  if (isInternal) {
    return buildInternalPageReadResult(
      [`${t("statusTitle")}：`, title, t("statusUrlPlain"), url],
      content,
    );
  }
  const { pageNumber, totalPages } = resolvePageChunk(result);
  return buildChunkPageReadResult(
    [
      t("statusReadSuccess"),
      `${t("statusTitle")}：`,
      title,
      t("statusUrlPlain"),
      url,
    ],
    content,
    pageNumber,
    totalPages,
  );
};

export const formatOpenBrowserPageResult = (
  result: OpenBrowserPageToolResult,
): string => {
  const { tabId, title, content, isInternal } = resolvePageReadResult(result);
  const headerLines = [
    t("statusOpenSuccess"),
    `${t("statusTitle")}：`,
    title,
    `${t("statusTabId")}：`,
    String(tabId),
  ];
  if (isInternal) {
    return buildInternalPageReadResult(headerLines, content);
  }
  const { pageNumber, totalPages } = resolvePageChunk(result);
  return buildChunkPageReadResult(headerLines, content, pageNumber, totalPages);
};

export const formatClickButtonResult = (
  result: ClickButtonToolResult,
): string => {
  const { title, content, isInternal } = resolvePageReadResult(result);
  return buildPageReadResult({
    headerLines: [t("statusClickSuccess"), `${t("statusTitle")}："${title}"；`],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal,
  });
};

export const formatFindResult = (result: FindToolResult): string => {
  if (!Array.isArray(result.pages)) {
    throw new Error("find 响应 pages 字段无效");
  }
  if (!result.pages.length) {
    return `${t("statusFindSuccess")}\n\n${t("statusFindNoMatch")}`;
  }
  const pageBlocks = result.pages.map((page, pageIndex) => {
    const pageNumber = resolvePositiveInteger(
      page.pageNumber,
      `pages[${String(pageIndex)}].pageNumber`,
    );
    if (!Array.isArray(page.lines) || !page.lines.length) {
      throw new Error(`pages[${String(pageIndex)}].lines 必须是非空数组`);
    }
    const lines = page.lines.map((line, lineIndex) => {
      const normalizedLine = resolveString(
        line,
        `pages[${String(pageIndex)}].lines[${String(lineIndex)}]`,
      ).trim();
      if (!normalizedLine) {
        throw new Error(
          `pages[${String(pageIndex)}].lines[${String(lineIndex)}] 不能为空`,
        );
      }
      return t("statusFindMatchedLine", [normalizedLine]);
    });
    return `${t("statusFindPageNumberLine", [String(pageNumber)])}\n${lines.join("\n")}`;
  });
  return `${t("statusFindSuccess")}\n\n${pageBlocks.join("\n\n")}`;
};

export const formatEnterTextResult = (result: EnterTextToolResult): string => {
  return resolveBoolean(result.ok, "ok")
    ? t("statusSuccess")
    : t("statusFailed");
};

export const formatCloseBrowserPageResult = (
  result: CloseBrowserPageToolResult,
): string => {
  if (!Array.isArray(result.items)) {
    throw new Error("close_page 响应 items 字段无效");
  }
  return result.items
    .map((item) => {
      const tabId = resolvePositiveInteger(item.tabId, "Tab ID");
      const ok = resolveBoolean(item.ok, "ok");
      if (ok) {
        return t("statusCloseTabSuccess", [String(tabId)]);
      }
      return t("statusCloseTabFailed", [String(tabId)]);
    })
    .join("\n");
};
