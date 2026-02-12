import type { FindToolPageResult, FindToolResult } from "../toolResultTypes.ts";
import {
  type GetAllPageContentRequest,
  type GetAllPageContentSuccessResponse,
  type PageContentChunk,
  parseRequiredPositiveInteger,
} from "../../../../shared/index.ts";
import { isInternalUrl, t } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { formatFindResult } from "../toolResultFormatters.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type FindArgs = {
  query: string;
  tabId: number;
};

type PageContentItem = {
  pageNumber: number;
  content: string;
};

const regexLiteralPattern = /^\/([\s\S]*)\/([a-z]*)$/;

const resolveRegex = (query: string): RegExp => {
  const literalMatch = regexLiteralPattern.exec(query);
  let source = query,
    flags = "";
  if (literalMatch) {
    flags = literalMatch[2];
    source = literalMatch[1];
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

const resolvePageContentItem = (
  item: PageContentChunk,
  index: number,
): PageContentItem => {
  const pageNumber = parseRequiredPositiveInteger(
    item.pageNumber,
    `pages[${String(index)}].pageNumber`,
  );
  return {
    content: item.content,
    pageNumber,
  };
};

const resolvePageContentItems = (
  response: GetAllPageContentSuccessResponse,
): PageContentItem[] => {
  return response.pages.map((item, index) =>
    resolvePageContentItem(item, index),
  );
};

const findMatchedLines = (content: string, regex: RegExp): string[] => {
  const lines = content.split(/\r?\n/);
  return lines.reduce<string[]>((result, line) => {
    regex.lastIndex = 0;
    if (regex.test(line)) {
      result.push(line);
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
      query: {
        description: t("toolParamQuery"),
        minLength: 1,
        pattern: "\\S",
        type: "string",
      },
      tabId: {
        description: t("toolParamTabId"),
        minimum: 1,
        type: "integer",
      },
    },
    required: ["tabId", "query"],
    type: "object",
  },
  execute = async (
    { query, tabId }: FindArgs,
    context: ToolExecutionContext,
  ): Promise<FindToolResult> => {
    const regex = resolveRegex(query.trim());
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
    const request: GetAllPageContentRequest = {
        tabId,
        type: "getAllPageContent",
      },
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
};
