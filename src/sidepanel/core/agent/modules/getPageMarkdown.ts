import { MARKDOWN_CHUNK_TOKENS } from "../../../../shared/index.ts";
import { isInternalUrl, t, type JsonValue } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { parsePageNumber } from "../validation/pageNumber.ts";
import {
  ensureObjectArgs,
  validateTabIdArgs,
} from "../validation/toolArgsValidation.ts";
import {
  buildGetPageMarkdownMessageContext,
  formatGetPageMarkdownResult,
} from "../toolResultFormatters.ts";
import type { GetPageMarkdownToolResult } from "../toolResultTypes.ts";

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
    type: "object",
    properties: {
      tabId: { type: "number" },
      page_number: {
        type: "number",
        description: t(
          "toolParamPageNumber",
          String(MARKDOWN_CHUNK_TOKENS),
        ),
      },
    },
    required: ["tabId", "page_number"],
    additionalProperties: false,
  },
  validateArgs = (args: JsonValue): GetPageArgs => {
    const argsRecord = ensureObjectArgs(args),
      { tabId } = validateTabIdArgs(argsRecord),
      preserveViewport = parsePreserveViewport(
        argsRecord.preserve_viewport ?? null,
      );
    const pageNumber = parsePageNumber(argsRecord.page_number ?? null);
    return { tabId, pageNumber, preserveViewport };
  },
  execute = async (
    { tabId, pageNumber, preserveViewport = false }: GetPageArgs,
    context: ToolExecutionContext,
  ): Promise<GetPageMarkdownToolResult> => {
    const tabs: BrowserTab[] = await context.getAllTabs(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new Error(`未找到 TabID 为 ${String(tabId)} 的标签页`);
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
        tabId,
        title: targetTab.title || "",
        url: targetTab.url,
        content: "",
        isInternal: true,
      };
    }
    const pageData = await context.fetchPageMarkdownData(tabId, pageNumber);
    if (followMode && !preserveViewport) {
      await context.syncPageHash(tabId, pageData);
    }
    return {
      tabId,
      title: pageData.title,
      url: pageData.url || targetTab.url,
      content: pageData.content,
      isInternal: false,
      pageNumber: pageData.pageNumber,
      totalPages: pageData.totalPages,
    };
  };

export default {
  key: "getPageMarkdown",
  name: "get_page",
  description: t("toolGetPage"),
  parameters,
  validateArgs,
  execute,
  formatResult: formatGetPageMarkdownResult,
  buildMessageContext: buildGetPageMarkdownMessageContext,
  pageReadDedupeAction: "removeToolCall",
};
