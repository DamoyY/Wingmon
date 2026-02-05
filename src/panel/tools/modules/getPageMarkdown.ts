import { isInternalUrl, t } from "../../utils/index.ts";
import { focusTab, getAllTabs } from "../../services/index.js";
import { parsePageNumber, validateTabIdArgs } from "../validation/index.js";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  type PageMarkdownData,
  shouldFollowMode,
  syncPageHash,
} from "../pageReadHelpers.ts";

type TabLike = {
  id?: number;
  url?: string;
  title?: string;
};

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

const getAllTabsSafe: () => Promise<TabLike[]> = getAllTabs as () => Promise<
    TabLike[]
  >,
  focusTabSafe: (tabId: number) => Promise<void> = focusTab as (
    tabId: number,
  ) => Promise<void>,
  isInternalUrlSafe: (url: string) => boolean = isInternalUrl as (
    url: string,
  ) => boolean,
  fetchPageMarkdownDataSafe: (
    tabId: number,
    pageNumber?: number,
  ) => Promise<PageMarkdownData> = fetchPageMarkdownData as (
    tabId: number,
    pageNumber?: number,
  ) => Promise<PageMarkdownData>,
  syncPageHashSafe: (
    tabId: number,
    pageData?: {
      pageNumber?: number;
      totalPages?: number;
      viewportPage?: number;
    },
  ) => Promise<void> = syncPageHash as (
    tabId: number,
    pageData?: {
      pageNumber?: number;
      totalPages?: number;
      viewportPage?: number;
    },
  ) => Promise<void>,
  shouldFollowModeSafe: () => Promise<boolean> =
    shouldFollowMode as () => Promise<boolean>,
  validateTabIdArgsSafe: (args: unknown) => { tabId: number } =
    validateTabIdArgs as (args: unknown) => { tabId: number },
  tSafe: (key: string, args?: string[]) => string = t as (
    key: string,
    args?: string[],
  ) => string,
  parsePageNumberSafe: (value: unknown) => number = parsePageNumber as (
    value: unknown,
  ) => number;

const parsePreserveViewport = (value: unknown): boolean => {
  if (value === undefined || value === null) {
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
        description: tSafe("toolParamPageNumber"),
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
      ? [`${tSafe("statusTitle")}：`, title, tSafe("statusUrlPlain"), url]
      : [
          tSafe("statusReadSuccess"),
          `${tSafe("statusTitle")}：`,
          title,
          tSafe("statusUrlPlain"),
          url,
        ];
    if (!isInternal) {
      if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
        throw new Error("get_page 响应缺少有效分块序号");
      }
      if (!Number.isInteger(totalPages) || totalPages <= 0) {
        throw new Error("get_page 响应缺少有效总分块数量");
      }
      headerLines.push(`${tSafe("statusTotalChunks")}：`, String(totalPages));
    }
    return buildPageReadResult({
      headerLines,
      contentLabel: isInternal
        ? ""
        : tSafe("statusChunkContent", [String(pageNumber)]),
      content,
      isInternal,
    });
  },
  validateArgs = (args: unknown): GetPageArgs => {
    const argsRecord = args as Record<string, unknown> | null,
      { tabId } = validateTabIdArgsSafe(args),
      preserveViewport = parsePreserveViewport(argsRecord?.preserve_viewport);
    const pageNumber = parsePageNumberSafe(argsRecord?.page_number);
    return { tabId, pageNumber, preserveViewport };
  },
  execute = async ({
    tabId,
    pageNumber,
    preserveViewport = false,
  }: GetPageArgs): Promise<string> => {
    const tabs = await getAllTabsSafe(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new Error(`未找到 TabID 为 ${String(tabId)} 的标签页`);
    }
    if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    const followMode = await shouldFollowModeSafe();
    if (followMode) {
      await focusTabSafe(tabId);
    }
    const internalUrl = isInternalUrlSafe(targetTab.url);
    if (internalUrl) {
      const title = targetTab.title || "";
      return buildPageMarkdownOutput({
        title,
        url: targetTab.url,
        isInternal: true,
      });
    }
    const pageData = await fetchPageMarkdownDataSafe(tabId, pageNumber);
    if (followMode && !preserveViewport) {
      await syncPageHashSafe(tabId, pageData);
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
  description: tSafe("toolGetPage"),
  parameters,
  validateArgs,
  execute,
};
