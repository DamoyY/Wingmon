import type { FindToolPageResult, FindToolResult } from "../toolResultTypes.ts";
import type {
  GetAllPageContentRequest,
  GetAllPageContentResponse,
  PageContentChunk,
} from "../../../../shared/index.ts";
import { type JsonValue, isInternalUrl, t } from "../../../lib/utils/index.ts";
import {
  type ToolArgObject,
  ensureObjectArgs,
} from "../validation/toolArgsValidation.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { formatFindResult } from "../toolResultFormatters.ts";
import { parseRequiredPositiveInteger } from "../validation/positiveInteger.js";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type FindArgs = {
  tabId: number;
  regex: RegExp;
};

type PageContentItem = {
  pageNumber: number;
  content: string;
};

const regexLiteralPattern = /^\/([\s\S]*)\/([a-z]*)$/;

const readArgValue = (record: ToolArgObject, key: string): JsonValue => {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key];
  }
  return null;
};

const resolveTabId = (record: ToolArgObject): number =>
  parseRequiredPositiveInteger(
    readArgValue(record, "tabId"),
    "Tab ID",
    ToolInputError,
  );

const resolveRegex = (query: string): RegExp => {
  const literalMatch = regexLiteralPattern.exec(query);
  let source = query,
    flags = "";
  if (literalMatch) {
    source = literalMatch[1];
    flags = literalMatch[2];
    if (!source) {
      throw new ToolInputError("query 正则内容不能为空");
    }
  }
  try {
    return new RegExp(source, flags);
  } catch (error) {
    console.error("query 正则解析失败", error);
    throw new ToolInputError("query 必须是合法的正则表达式");
  }
};

const resolveQuery = (value: JsonValue): string => {
  if (typeof value !== "string") {
    throw new ToolInputError("query 必须是非空字符串");
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ToolInputError("query 必须是非空字符串");
  }
  return normalized;
};

const resolvePageContentItem = (
  item: PageContentChunk | null | undefined,
  index: number,
): PageContentItem => {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new Error(`pages[${String(index)}] 必须是对象`);
  }
  const pageNumber = parseRequiredPositiveInteger(
    item.pageNumber ?? null,
    `pages[${String(index)}].pageNumber`,
  );
  if (typeof item.content !== "string") {
    throw new Error(`pages[${String(index)}].content 必须是字符串`);
  }
  return {
    content: item.content,
    pageNumber,
  };
};

const resolvePageContentItems = (
  response: GetAllPageContentResponse,
): PageContentItem[] => {
  if (!Array.isArray(response.pages)) {
    throw new Error("页面分块数据缺失");
  }
  return response.pages.map((item, index) =>
    resolvePageContentItem(item, index),
  );
};

const findMatchedLines = (content: string, regex: RegExp): string[] => {
  const lines = content.split(/\r?\n/);
  return lines.reduce<string[]>((result, line) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return result;
    }
    regex.lastIndex = 0;
    if (regex.test(normalizedLine)) {
      result.push(normalizedLine);
    }
    return result;
  }, []);
};

const buildFindPageResults = (
  pages: PageContentItem[],
  regex: RegExp,
): FindToolPageResult[] => {
  const sortedPages = [...pages].sort(
    (left, right) => left.pageNumber - right.pageNumber,
  );
  return sortedPages.reduce<FindToolPageResult[]>((result, page) => {
    const lines = findMatchedLines(page.content, regex);
    if (!lines.length) {
      return result;
    }
    result.push({
      lines,
      pageNumber: page.pageNumber,
    });
    return result;
  }, []);
};

const parameters = {
    additionalProperties: false,
    properties: {
      query: { description: t("toolParamQuery"), type: "string" },
      tabId: { description: t("toolParamTabId"), type: "number" },
    },
    required: ["tabId", "query"],
    type: "object",
  },
  validateArgs = (args: JsonValue): FindArgs => {
    const record = ensureObjectArgs(args),
      tabId = resolveTabId(record),
      query = resolveQuery(readArgValue(record, "query")),
      regex = resolveRegex(query);
    return {
      regex,
      tabId,
    };
  },
  execute = async (
    { tabId, regex }: FindArgs,
    context: ToolExecutionContext,
  ): Promise<FindToolResult> => {
    const tabs: BrowserTab[] = await context.getAllTabs(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new ToolInputError(`未找到 Tab ID 为 ${String(tabId)} 的标签页`);
    }
    if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
      throw new ToolInputError("标签页缺少 URL");
    }
    if (isInternalUrl(targetTab.url)) {
      throw new ToolInputError("该标签页为浏览器内部页面，无法查找");
    }
    const followMode = await context.shouldFollowMode();
    if (followMode) {
      await context.focusTab(tabId);
    }
    const request: GetAllPageContentRequest = { type: "getAllPageContent" },
      response = await context.sendMessageToTab(tabId, request),
      pageItems = resolvePageContentItems(response),
      pages = buildFindPageResults(pageItems, regex);
    return { pages };
  };

export default {
  description: t("toolFind"),
  execute,
  formatResult: formatFindResult,
  key: "find",
  name: "find",
  parameters,
  validateArgs,
};
