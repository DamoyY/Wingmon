import { isInternalUrl, t } from "../../utils/index.ts";
import { focusTab, getAllTabs } from "../../services/index.js";
import { parsePageNumber, validateTabIdArgs } from "../validation/index.js";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
} from "../pageRead.ts";

type TabLike = {
  id?: number;
  url?: string;
  title?: string;
};

type GetPageArgs = {
  tabId: number;
  pageNumber?: number;
};

type PageMarkdownOutputArgs = {
  title: string;
  url: string;
  content?: string;
  isInternal: boolean;
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
  ) => Promise<{ title: string; url: string; content: string }> =
    fetchPageMarkdownData as (
      tabId: number,
      pageNumber?: number,
    ) => Promise<{ title: string; url: string; content: string }>,
  shouldFollowModeSafe: () => Promise<boolean> =
    shouldFollowMode as () => Promise<boolean>,
  validateTabIdArgsSafe: (args: unknown) => { tabId: number } =
    validateTabIdArgs as (args: unknown) => { tabId: number },
  tSafe: (key: string) => string = t as (key: string) => string,
  parsePageNumberSafe: (value: unknown) => number | undefined =
    parsePageNumber as (value: unknown) => number | undefined;

const parameters = {
    type: "object",
    properties: {
      tabId: { type: "number" },
      page_number: {
        type: "number",
        description: tSafe("toolParamPageNumber"),
      },
    },
    required: ["tabId"],
    additionalProperties: false,
  },
  buildPageMarkdownOutput = ({
    title,
    url,
    content = "",
    isInternal,
  }: PageMarkdownOutputArgs): string => {
    const headerLines = isInternal
      ? [tSafe("statusTitleLabel"), title, "**URL：**", url]
      : [tSafe("statusTitleLabel"), title, tSafe("statusUrlLabel"), url];
    return buildPageReadResult({
      headerLines,
      contentLabel: tSafe("statusContentLabel"),
      content,
      isInternal,
    });
  },
  validateArgs = (args: unknown): GetPageArgs => {
    const { tabId } = validateTabIdArgsSafe(args);
    const pageNumber = parsePageNumberSafe(
      (args as Record<string, unknown> | null)?.page_number,
    );
    return { tabId, pageNumber };
  },
  execute = async ({ tabId, pageNumber }: GetPageArgs): Promise<string> => {
    const tabs = await getAllTabsSafe(),
      targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      throw new Error(`未找到 TabID 为 ${String(tabId)} 的标签页`);
    }
    if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    if (await shouldFollowModeSafe()) {
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
    const { title, url, content } = await fetchPageMarkdownDataSafe(
      tabId,
      pageNumber,
    );
    return buildPageMarkdownOutput({
      title,
      url,
      content,
      isInternal: false,
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
