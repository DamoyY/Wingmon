import {
  type ClickButtonToolResult,
  type CloseBrowserPageToolResult,
  type EnterTextToolResult,
  type FindToolResult,
  type GetPageMarkdownToolResult,
  type OpenBrowserPageToolResult,
  type PageReadToolResult,
  type ToolImageInput,
  isSupportedPageImageMimeType,
} from "./toolResultTypes.ts";
import type {
  ToolCall,
  ToolMessageContext,
  ToolPageReadEvent,
} from "./definitions.ts";
import {
  parseOptionalPositiveInteger,
  parseRequiredPositiveInteger,
} from "./validation/index.js";
import { buildPageReadResult } from "./pageReadHelpers.ts";
import { ensureString } from "../../../shared/index.ts";
import { t } from "../../lib/utils/index.ts";

type PageReadEventOptions = {
  requirePageNumber: boolean;
  skipInternal: boolean;
};

type PageReadMessageContextOptions = PageReadEventOptions & {
  outputWithoutContent?: string;
};

type NormalizedPageReadResult = {
  tabId: number;
  title: string;
  url: string;
  content: string;
  isInternal: boolean;
  imageInput?: ToolImageInput;
};

export const AGENT_STATUS = {
  browsing: "browsing",
  coding: "coding",
  idle: "idle",
  operating: "operating",
  searching: "searching",
  speaking: "speaking",
  thinking: "thinking",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

const TOOL_STATUS_MAP: Partial<Record<string, AgentStatus>> = {
  click_button: AGENT_STATUS.operating,
  close_tab: AGENT_STATUS.operating,
  enter_text: AGENT_STATUS.operating,
  find: AGENT_STATUS.searching,
  get_page: AGENT_STATUS.browsing,
  list_tabs: AGENT_STATUS.browsing,
  run_console: AGENT_STATUS.coding,
  show_html: AGENT_STATUS.coding,
  wait: AGENT_STATUS.thinking,
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

const resolveOptionalOutputWithoutContent = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error("outputWithoutContent 必须是字符串");
  }
  const normalized = value.trimEnd();
  if (!normalized.trim()) {
    throw new Error("outputWithoutContent 不能为空");
  }
  return normalized;
};

const resolveOptionalImageInput = (
  value: PageReadToolResult["imageInput"],
): ToolImageInput | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isSupportedPageImageMimeType(value.mimeType)) {
    throw new Error("imageInput.mimeType 无效");
  }
  if (value.sourceType === "url") {
    if (typeof value.url !== "string" || !value.url.trim()) {
      throw new Error("imageInput.url 无效");
    }
    return { mimeType: value.mimeType, sourceType: "url", url: value.url };
  }
  if (typeof value.data !== "string" || !value.data.trim()) {
    throw new Error("imageInput.data 无效");
  }
  return { data: value.data, mimeType: value.mimeType, sourceType: "base64" };
};

const resolvePageReadResult = (
  result: PageReadToolResult,
): NormalizedPageReadResult => ({
  content: ensureString(result.content, "content"),
  imageInput: resolveOptionalImageInput(result.imageInput),
  isInternal: resolveBoolean(result.isInternal, "isInternal"),
  tabId: parseRequiredPositiveInteger(result.tabId, "Tab ID"),
  title: ensureString(result.title, "title"),
  url: ensureString(result.url, "url"),
});

const resolvePageChunk = (
  result: PageReadToolResult,
): { pageNumber: number; totalPages: number } => ({
  pageNumber: parseRequiredPositiveInteger(result.pageNumber, "pageNumber"),
  totalPages: parseRequiredPositiveInteger(result.totalPages, "totalPages"),
});

const resolveToolCallName = (call: ToolCall): string =>
  call.function?.name ?? call.name ?? "";

const resolveToolCallArguments = (call: ToolCall): string => {
  const args = call.function?.arguments ?? call.arguments;
  return typeof args === "string" ? args : "";
};

const isGoogleSearchOpen = (argsText: string): boolean =>
  argsText.includes("https://www.google.com/search");

export const resolveStatusFromToolCalls = (
  toolCalls: ToolCall[],
): AgentStatus => {
  if (!Array.isArray(toolCalls)) {
    throw new Error("toolCalls 必须是数组");
  }
  if (!toolCalls.length) {
    return AGENT_STATUS.idle;
  }
  for (const call of toolCalls) {
    const name = resolveToolCallName(call);
    if (!name) {
      continue;
    }
    if (name === "open_page") {
      return isGoogleSearchOpen(resolveToolCallArguments(call))
        ? AGENT_STATUS.searching
        : AGENT_STATUS.browsing;
    }
    const mapped = TOOL_STATUS_MAP[name];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return AGENT_STATUS.idle;
};

const buildPageReadEvent = (
  result: PageReadToolResult,
  options: PageReadEventOptions,
): ToolPageReadEvent | null => {
  const pageReadResult = resolvePageReadResult(result);
  if (options.skipInternal && pageReadResult.isInternal) {
    return null;
  }
  const pageReadEvent: ToolPageReadEvent = { tabId: pageReadResult.tabId };
  const pageNumber = parseOptionalPositiveInteger(
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
  options: PageReadMessageContextOptions,
): ToolMessageContext | null => {
  const pageReadResult = resolvePageReadResult(result),
    pageReadEvent = buildPageReadEvent(result, options);
  if (pageReadEvent === null) {
    return null;
  }
  const outputWithoutContent = resolveOptionalOutputWithoutContent(
      options.outputWithoutContent,
    ),
    messageContext: ToolMessageContext = { pageReadEvent };
  if (outputWithoutContent !== undefined) {
    messageContext.outputWithoutContent = outputWithoutContent;
  }
  if (pageReadResult.imageInput !== undefined) {
    messageContext.imageInput = pageReadResult.imageInput;
  }
  return messageContext;
};

const buildRequiredPageReadMessageContext = (
  result: PageReadToolResult,
  errorMessage: string,
  outputWithoutContent?: string,
): ToolMessageContext => {
  const pageReadResult = resolvePageReadResult(result),
    pageReadEvent = buildPageReadEvent(result, {
      requirePageNumber: false,
      skipInternal: false,
    });
  if (pageReadEvent === null) {
    throw new Error(errorMessage);
  }
  const normalizedOutputWithoutContent =
      resolveOptionalOutputWithoutContent(outputWithoutContent),
    messageContext: ToolMessageContext = { pageReadEvent };
  if (normalizedOutputWithoutContent !== undefined) {
    messageContext.outputWithoutContent = normalizedOutputWithoutContent;
  }
  if (pageReadResult.imageInput !== undefined) {
    messageContext.imageInput = pageReadResult.imageInput;
  }
  return messageContext;
};

const buildInternalPageReadResult = (
  headerLines: string[],
  content: string,
): string =>
  buildPageReadResult({
    content,
    contentLabel: "",
    headerLines,
    isInternal: true,
  });

const buildChunkPageReadResult = (
  headerLines: string[],
  content: string,
  pageNumber: number,
  totalPages: number,
): string =>
  buildPageReadResult({
    content,
    contentLabel: t("statusChunkContent", [String(pageNumber)]),
    headerLines: [
      ...headerLines,
      `${t("statusTotalChunks")}：`,
      String(totalPages),
    ],
    isInternal: false,
  });

const buildHeaderOnlyPageReadResult = (
    headerLines: string[],
    isInternal: boolean,
  ): string => {
    if (isInternal) {
      return buildPageReadResult({
        content: "",
        contentLabel: "",
        headerLines,
        isInternal: true,
      });
    }
    return headerLines.join("\n");
  },
  buildOpenBrowserPageOutputWithoutContent = (
    result: OpenBrowserPageToolResult,
  ): string => {
    const { tabId, title, isInternal, imageInput } =
        resolvePageReadResult(result),
      headerLines = [
        t("statusOpenSuccess"),
        `${t("statusTitle")}：`,
        title,
        `${t("statusTabId")}：`,
        String(tabId),
      ];
    if (isInternal) {
      return buildHeaderOnlyPageReadResult(headerLines, true);
    }
    if (imageInput !== undefined) {
      return buildHeaderOnlyPageReadResult(headerLines, false);
    }
    const { totalPages } = resolvePageChunk(result);
    return buildHeaderOnlyPageReadResult(
      [...headerLines, `${t("statusTotalChunks")}：`, String(totalPages)],
      false,
    );
  },
  buildClickButtonOutputWithoutContent = (
    result: ClickButtonToolResult,
  ): string => {
    const { isInternal } = resolvePageReadResult(result);
    return buildHeaderOnlyPageReadResult([t("statusClickSuccess")], isInternal);
  };

type EnterTextPageReadResult = PageReadToolResult & { ok: true };

const isEnterTextPageReadResult = (
  result: EnterTextToolResult,
): result is EnterTextPageReadResult => {
  return "tabId" in result;
};

const buildEnterTextOutputWithoutContent = (
  result: EnterTextPageReadResult,
): string => {
  const { isInternal } = resolvePageReadResult(result);
  return buildHeaderOnlyPageReadResult(
    [t("statusEnterTextSuccess")],
    isInternal,
  );
};

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
  buildRequiredPageReadMessageContext(
    result,
    "open_page 缺少页面读取事件",
    buildOpenBrowserPageOutputWithoutContent(result),
  );

export const buildClickButtonMessageContext = (
  _args: unknown,
  result: ClickButtonToolResult,
): ToolMessageContext =>
  buildRequiredPageReadMessageContext(
    result,
    "click_button 缺少页面读取事件",
    buildClickButtonOutputWithoutContent(result),
  );

export const buildEnterTextMessageContext = (
  args: { pressEnter: boolean },
  result: EnterTextToolResult,
): ToolMessageContext | null => {
  if (!args.pressEnter) {
    return null;
  }
  if (!resolveBoolean(result.ok, "ok")) {
    return null;
  }
  if (!isEnterTextPageReadResult(result)) {
    return null;
  }
  return buildRequiredPageReadMessageContext(
    result,
    "enter_text 缺少页面读取事件",
    buildEnterTextOutputWithoutContent(result),
  );
};

export const formatGetPageMarkdownResult = (
  result: GetPageMarkdownToolResult,
): string => {
  const { title, url, content, isInternal, imageInput } =
    resolvePageReadResult(result);
  if (isInternal) {
    return buildInternalPageReadResult(
      [`${t("statusTitle")}：`, title, t("statusUrlPlain"), url],
      content,
    );
  }
  if (imageInput !== undefined) {
    return buildHeaderOnlyPageReadResult(
      [
        t("statusReadSuccess"),
        `${t("statusTitle")}：`,
        title,
        t("statusUrlPlain"),
        url,
      ],
      false,
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
  const { tabId, title, content, isInternal, imageInput } =
      resolvePageReadResult(result),
    headerLines = [
      t("statusOpenSuccess"),
      `${t("statusTitle")}：`,
      title,
      `${t("statusTabId")}：`,
      String(tabId),
    ];
  if (imageInput !== undefined) {
    return buildHeaderOnlyPageReadResult(headerLines, false);
  }
  if (isInternal) {
    return buildInternalPageReadResult(headerLines, content);
  }
  const { pageNumber, totalPages } = resolvePageChunk(result);
  return buildChunkPageReadResult(headerLines, content, pageNumber, totalPages);
};

export const formatClickButtonResult = (
  result: ClickButtonToolResult,
): string => {
  const { content, isInternal } = resolvePageReadResult(result);
  return buildPageReadResult({
    content,
    contentLabel: `${t("statusContent")}：`,
    headerLines: [t("statusClickSuccess")],
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
    const pageNumber = parseRequiredPositiveInteger(
      page.pageNumber,
      `pages[${String(pageIndex)}].pageNumber`,
    );
    if (!Array.isArray(page.lines) || !page.lines.length) {
      throw new Error(`pages[${String(pageIndex)}].lines 必须是非空数组`);
    }
    const lines = page.lines.map((line, lineIndex) => {
      const text = ensureString(
        line,
        `pages[${String(pageIndex)}].lines[${String(lineIndex)}]`,
      );
      return t("statusFindMatchedLine", [text]);
    });
    return `${t("statusFindPageNumberLine", [String(pageNumber)])}\n${lines.join("\n")}`;
  });
  return `${t("statusFindSuccess")}\n\n${pageBlocks.join("\n\n")}`;
};

export const formatEnterTextResult = (result: EnterTextToolResult): string => {
  if (!resolveBoolean(result.ok, "ok")) {
    return t("statusFailed");
  }
  if (!isEnterTextPageReadResult(result)) {
    return t("statusEnterTextSuccess");
  }
  const { content, isInternal } = resolvePageReadResult(result);
  return buildPageReadResult({
    content,
    contentLabel: `${t("statusContent")}：`,
    headerLines: [t("statusEnterTextSuccess")],
    isInternal,
  });
};

export const formatCloseBrowserPageResult = (
  result: CloseBrowserPageToolResult,
): string => {
  if (!Array.isArray(result.items)) {
    throw new Error("close_tab 响应 items 字段无效");
  }
  return result.items
    .map((item) => {
      const tabId = parseRequiredPositiveInteger(item.tabId, "Tab ID");
      const ok = resolveBoolean(item.ok, "ok");
      if (ok) {
        return t("statusCloseTabSuccess", [String(tabId)]);
      }
      return t("statusCloseTabFailed", [String(tabId)]);
    })
    .join("\n");
};
