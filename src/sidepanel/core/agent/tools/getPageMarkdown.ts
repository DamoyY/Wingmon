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
  pageNumber: number;
  preserveViewport?: boolean;
  tabId: number;
};

const parsePreserveViewport = (value: JsonValue): boolean => {
  if (value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error("preserveViewport 必须是布尔值");
};

const parameters = {
    additionalProperties: false,
    properties: {
      pageNumber: {
        description: t("toolParamPageNumber", String(MARKDOWN_CHUNK_TOKENS)),
        type: "number",
      },
      preserveViewport: { type: "boolean" },
      tabId: { type: "number" },
    },
    required: ["pageNumber", "tabId"],
    type: "object",
  },
  validateArgs = (args: JsonValue): GetPageArgs => {
    const argsRecord = ensureObjectArgs(args),
      { tabId } = validateTabIdArgs(argsRecord),
      preserveViewport = parsePreserveViewport(
        argsRecord.preserveViewport ?? null,
      );
    const pageNumber = parsePageNumber(argsRecord.pageNumber ?? null);
    return { pageNumber, preserveViewport, tabId };
  },
  execute = async (
    { pageNumber, preserveViewport = false, tabId }: GetPageArgs,
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
