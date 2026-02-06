import { isInternalUrl, t, type JsonValue } from "../../utils/index.ts";
import { type BrowserTab, focusTab, getAllTabs } from "../../services/index.ts";
import { parsePageNumber } from "../validation/pageNumber.ts";
import {
  ensureObjectArgs,
  validateTabIdArgs,
} from "../validation/toolArgsValidation.ts";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
  syncPageHash,
} from "../pageReadHelpers.ts";

type GetPageArgs = {
  tabId: number;
  pageNumber: number;
  preserveViewport?: boolean;
};

type PageMarkdownOutputArgs = {
  title: string;
  url: string;
  content?: string;
  isInternal: boolean;
  pageNumber?: number;
  totalPages?: number;
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
        description: t("toolParamPageNumber"),
      },
    },
    required: ["tabId", "page_number"],
    additionalProperties: false,
  },
  buildPageMarkdownOutput = ({
    title,
    url,
    content = "",
    isInternal,
    pageNumber,
    totalPages,
  }: PageMarkdownOutputArgs): string => {
    const headerLines = isInternal
      ? [`${t("statusTitle")}：`, title, t("statusUrlPlain"), url]
      : [
          t("statusReadSuccess"),
          `${t("statusTitle")}：`,
          title,
          t("statusUrlPlain"),
          url,
        ];
    if (!isInternal) {
      if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
        throw new Error("get_page 响应缺少有效分块序号");
      }
      if (!Number.isInteger(totalPages) || totalPages <= 0) {
        throw new Error("get_page 响应缺少有效总分块数量");
      }
      headerLines.push(`${t("statusTotalChunks")}：`, String(totalPages));
    }
    return buildPageReadResult({
      headerLines,
      contentLabel: isInternal
        ? ""
        : t("statusChunkContent", [String(pageNumber)]),
      content,
      isInternal,
    });
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
  execute = async ({
    tabId,
    pageNumber,
    preserveViewport = false,
  }: GetPageArgs): Promise<string> => {
    const tabs: BrowserTab[] = await getAllTabs(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new Error(`未找到 TabID 为 ${String(tabId)} 的标签页`);
    }
    if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    const followMode = await shouldFollowMode();
    if (followMode) {
      await focusTab(tabId);
    }
    const internalUrl = isInternalUrl(targetTab.url);
    if (internalUrl) {
      const title = targetTab.title || "";
      return buildPageMarkdownOutput({
        title,
        url: targetTab.url,
        isInternal: true,
      });
    }
    const pageData = await fetchPageMarkdownData(tabId, pageNumber);
    if (followMode && !preserveViewport) {
      await syncPageHash(tabId, pageData);
    }
    return buildPageMarkdownOutput({
      title: pageData.title,
      url: pageData.url,
      content: pageData.content,
      isInternal: false,
      pageNumber: pageData.pageNumber,
      totalPages: pageData.totalPages,
    });
  };

export default {
  key: "getPageMarkdown",
  name: "get_page",
  description: t("toolGetPage"),
  parameters,
  validateArgs,
  execute,
};
