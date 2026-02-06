import { t } from "../utils/index.ts";
import { buildPageReadResult } from "./pageReadHelpers.ts";
import type { ToolMessageContext, ToolPageReadEvent } from "./definitions.ts";
import type {
  ClickButtonToolResult,
  CloseBrowserPageToolResult,
  EnterTextToolResult,
  GetPageMarkdownToolResult,
  OpenBrowserPageToolResult,
  PageReadToolResult,
} from "./toolResultTypes.ts";

const resolvePositiveInteger = (value: number, fieldName: string): number => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} 必须是正整数`);
    }
    return value;
  },
  resolveOptionalPositiveInteger = (
    value: number | undefined,
    fieldName: string,
  ): number | undefined => {
    if (value === undefined) {
      return undefined;
    }
    return resolvePositiveInteger(value, fieldName);
  },
  resolveNonEmptyString = (value: string, fieldName: string): string => {
    if (typeof value !== "string") {
      throw new Error(`${fieldName} 必须是字符串`);
    }
    return value;
  },
  resolveTrimmedUrl = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed;
  },
  buildPageReadEvent = (
    result: PageReadToolResult,
    options: {
      requirePageNumber: boolean;
      skipInternal: boolean;
    },
  ): ToolPageReadEvent | null => {
    if (options.skipInternal && result.isInternal) {
      return null;
    }
    const event: ToolPageReadEvent = {
      tabId: resolvePositiveInteger(result.tabId, "tabId"),
    };
    const pageNumber = resolveOptionalPositiveInteger(
      result.pageNumber,
      "pageNumber",
    );
    if (options.requirePageNumber) {
      if (pageNumber === undefined) {
        throw new Error("pageNumber 缺失");
      }
      event.pageNumber = pageNumber;
    } else if (pageNumber !== undefined) {
      event.pageNumber = pageNumber;
    }
    const url = resolveTrimmedUrl(resolveNonEmptyString(result.url, "url"));
    if (url) {
      event.url = url;
    }
    return event;
  };

export const buildGetPageMarkdownMessageContext = (
  _args: unknown,
  result: GetPageMarkdownToolResult,
): ToolMessageContext | null => {
  const pageReadEvent = buildPageReadEvent(result, {
    requirePageNumber: true,
    skipInternal: true,
  });
  if (!pageReadEvent) {
    return null;
  }
  return { pageReadEvent };
};

export const buildOpenBrowserPageMessageContext = (
  _args: unknown,
  result: OpenBrowserPageToolResult,
): ToolMessageContext => ({
  pageReadEvent: (() => {
    const pageReadEvent = buildPageReadEvent(result, {
      requirePageNumber: false,
      skipInternal: false,
    });
    if (!pageReadEvent) {
      throw new Error("open_page 缺少页面读取事件");
    }
    return pageReadEvent;
  })(),
});

export const buildClickButtonMessageContext = (
  _args: unknown,
  result: ClickButtonToolResult,
): ToolMessageContext => ({
  pageReadEvent: (() => {
    const pageReadEvent = buildPageReadEvent(result, {
      requirePageNumber: false,
      skipInternal: false,
    });
    if (!pageReadEvent) {
      throw new Error("click_button 缺少页面读取事件");
    }
    return pageReadEvent;
  })(),
});

export const formatGetPageMarkdownResult = (
  result: GetPageMarkdownToolResult,
): string => {
  const title = resolveNonEmptyString(result.title, "title"),
    url = resolveNonEmptyString(result.url, "url"),
    content = resolveNonEmptyString(result.content, "content");
  if (result.isInternal) {
    return buildPageReadResult({
      headerLines: [`${t("statusTitle")}：`, title, t("statusUrlPlain"), url],
      contentLabel: "",
      content,
      isInternal: true,
    });
  }
  const pageNumber = resolvePositiveInteger(
      result.pageNumber ?? 0,
      "pageNumber",
    ),
    totalPages = resolvePositiveInteger(result.totalPages ?? 0, "totalPages");
  return buildPageReadResult({
    headerLines: [
      t("statusReadSuccess"),
      `${t("statusTitle")}：`,
      title,
      t("statusUrlPlain"),
      url,
      `${t("statusTotalChunks")}：`,
      String(totalPages),
    ],
    contentLabel: t("statusChunkContent", [String(pageNumber)]),
    content,
    isInternal: false,
  });
};

export const formatOpenBrowserPageResult = (
  result: OpenBrowserPageToolResult,
): string => {
  const title = resolveNonEmptyString(result.title, "title"),
    content = resolveNonEmptyString(result.content, "content"),
    tabId = resolvePositiveInteger(result.tabId, "tabId"),
    headerLines = [
      t("statusOpenSuccess"),
      `${t("statusTitle")}: `,
      title,
      `${t("statusTabId")}: `,
      String(tabId),
    ];
  if (result.isInternal) {
    return buildPageReadResult({
      headerLines,
      contentLabel: "",
      content,
      isInternal: true,
    });
  }
  const pageNumber = resolvePositiveInteger(
      result.pageNumber ?? 0,
      "pageNumber",
    ),
    totalPages = resolvePositiveInteger(result.totalPages ?? 0, "totalPages");
  return buildPageReadResult({
    headerLines: [
      ...headerLines,
      `${t("statusTotalChunks")}：`,
      String(totalPages),
    ],
    contentLabel: t("statusChunkContent", [String(pageNumber)]),
    content,
    isInternal: false,
  });
};

export const formatClickButtonResult = (
  result: ClickButtonToolResult,
): string => {
  const title = resolveNonEmptyString(result.title, "title"),
    content = resolveNonEmptyString(result.content, "content");
  return buildPageReadResult({
    headerLines: [t("statusClickSuccess"), `${t("statusTitle")}："${title}"；`],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal: result.isInternal,
  });
};

export const formatEnterTextResult = (result: EnterTextToolResult): string => {
  if (typeof result.ok !== "boolean") {
    throw new Error("enter_text 响应 ok 字段无效");
  }
  return result.ok ? t("statusSuccess") : t("statusFailed");
};

export const formatCloseBrowserPageResult = (
  result: CloseBrowserPageToolResult,
): string => {
  if (!Array.isArray(result.items)) {
    throw new Error("close_page 响应 items 字段无效");
  }
  return result.items
    .map((item) => {
      const tabId = resolvePositiveInteger(item.tabId, "tabId");
      if (typeof item.ok !== "boolean") {
        throw new Error("close_page 响应 ok 字段无效");
      }
      if (item.ok) {
        return t("statusCloseTabSuccess", [String(tabId)]);
      }
      return t("statusCloseTabFailed", [String(tabId)]);
    })
    .join("\n");
};
