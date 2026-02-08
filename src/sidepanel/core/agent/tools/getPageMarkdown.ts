import { type JsonValue, isInternalUrl, t } from "../../../lib/utils/index.ts";
import {
  buildGetPageMarkdownMessageContext,
  formatGetPageMarkdownResult,
} from "../toolResultFormatters.ts";
import {
  ensureObjectArgs,
  validateTabIdArgs,
} from "../validation/toolArgsValidation.ts";
import type { GetPageMarkdownToolResult } from "../toolResultTypes.ts";
import { MARKDOWN_CHUNK_TOKENS } from "../../../../shared/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { parsePageNumber } from "../validation/parsePageNumber.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type GetPageArgs = {
  tabId: number;
  pageNumber: number;
  preserveViewport?: boolean;
};

const parsePreserveViewport = (value: JsonValue): boolean => {
  if (value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }
  throw new Error("preserve_viewport 必须是布尔值");
};

const parameters = {
    additionalProperties: false,
    properties: {
      page_number: {
        description: t("toolParamPageNumber", String(MARKDOWN_CHUNK_TOKENS)),
        type: "number",
      },
      tabId: { type: "number" },
    },
    required: ["tabId", "page_number"],
    type: "object",
  },
  validateArgs = (args: JsonValue): GetPageArgs => {
    const argsRecord = ensureObjectArgs(args),
      { tabId } = validateTabIdArgs(argsRecord),
      preserveViewport = parsePreserveViewport(
        argsRecord.preserve_viewport ?? null,
      );
    const pageNumber = parsePageNumber(argsRecord.page_number ?? null);
    return { pageNumber, preserveViewport, tabId };
  },
  execute = async (
    { tabId, pageNumber, preserveViewport = false }: GetPageArgs,
    context: ToolExecutionContext,
  ): Promise<GetPageMarkdownToolResult> => {
    const tabs: BrowserTab[] = await context.getAllTabs(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new Error(`未找到 Tab ID 为 ${String(tabId)} 的标签页`);
    }
    if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    const followMode = await context.shouldFollowMode();
    if (followMode) {
      await context.focusTab(tabId);
    }
    const internalUrl = isInternalUrl(targetTab.url);
    if (internalUrl) {
      return {
        content: "",
        isInternal: true,
        tabId,
        title: targetTab.title || "",
        url: targetTab.url,
      };
    }
    const pageData = await context.fetchPageMarkdownData(tabId, pageNumber);
    if (followMode && !preserveViewport) {
      await context.syncPageHash(tabId, pageData);
    }
    return {
      content: pageData.content,
      isInternal: false,
      pageNumber: pageData.pageNumber,
      tabId,
      title: pageData.title,
      totalPages: pageData.totalPages,
      url: pageData.url || targetTab.url,
    };
  };

export default {
  buildMessageContext: buildGetPageMarkdownMessageContext,
  description: t("toolGetPage"),
  execute,
  formatResult: formatGetPageMarkdownResult,
  key: "getPageMarkdown",
  name: "get_page",
  pageReadDedupeAction: "removeToolCall",
  parameters,
  validateArgs,
};
