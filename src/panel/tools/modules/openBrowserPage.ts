import { isPdfUrl } from "../../../shared/index.ts";
import { isInternalUrl, t, type JsonValue } from "../../utils/index.ts";
import {
  type BrowserTab,
  createTab,
  focusTab,
  getAllTabs,
} from "../../services/index.ts";
import ToolInputError from "../errors.ts";
import { parsePageNumber } from "../validation/pageNumber.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
  syncPageHash,
} from "../pageReadHelpers.ts";

type OpenPageArgs = {
  url: string;
  focus: boolean;
  pageNumber: number;
};

type OpenPageReadOutputArgs = {
  title: string;
  tabId: number;
  content?: string;
  isInternal: boolean;
  pageNumber?: number;
  totalPages?: number;
};

type NormalizedTab = BrowserTab & {
  normalizedUrl: string;
};

const parameters = {
    type: "object",
    properties: {
      url: { type: "string" },
      focus: { type: "boolean", description: t("toolParamFocus") },
      page_number: {
        type: "number",
        description: t("toolParamPageNumber"),
      },
    },
    required: ["url", "focus", "page_number"],
    additionalProperties: false,
  },
  buildOpenPageReadOutput = ({
    title,
    tabId,
    content = "",
    isInternal,
    pageNumber,
    totalPages,
  }: OpenPageReadOutputArgs): string =>
    (() => {
      const headerLines = [
        t("statusOpenSuccess"),
        `${t("statusTitle")}: `,
        title,
        `${t("statusTabId")}: `,
        String(tabId),
      ];
      if (isInternal) {
        return buildPageReadResult({
          headerLines,
          contentLabel: "",
          content,
          isInternal: true,
        });
      }
      if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
        throw new Error("open_page 响应缺少有效分块序号");
      }
      if (!Number.isInteger(totalPages) || totalPages <= 0) {
        throw new Error("open_page 响应缺少有效总分块数量");
      }
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
    })(),
  normalizeTab = (tab: BrowserTab): NormalizedTab | null => {
    if (typeof tab.url !== "string" || !tab.url.trim()) {
      console.error("标签页缺少 URL", tab);
      return null;
    }
    try {
      return { ...tab, normalizedUrl: new URL(tab.url).toString() };
    } catch (error) {
      console.error("标签页 URL 解析失败", tab, error);
      return null;
    }
  },
  validateArgs = (args: JsonValue): OpenPageArgs => {
    const rawArgs = ensureObjectArgs(args);
    if (typeof rawArgs.url !== "string" || !rawArgs.url.trim()) {
      throw new ToolInputError("url 必须是非空字符串");
    }
    if (typeof rawArgs.focus !== "boolean") {
      throw new ToolInputError("focus 必须是布尔值");
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawArgs.url);
    } catch (error) {
      console.error("url 格式不正确", error);
      throw new ToolInputError("url 格式不正确");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ToolInputError("url 仅支持 http 或 https");
    }
    const pageNumber = parsePageNumber(rawArgs.page_number);
    return { url: parsedUrl.toString(), focus: rawArgs.focus, pageNumber };
  },
  execute = async ({
    url,
    focus,
    pageNumber,
  }: OpenPageArgs): Promise<string> => {
    const followMode = await shouldFollowMode(),
      shouldFocus = followMode || focus,
      tabs: BrowserTab[] = await getAllTabs(),
      normalizedTabs = tabs
        .map(normalizeTab)
        .filter((tab): tab is NormalizedTab => Boolean(tab)),
      matchedTab = normalizedTabs.find((tab) => tab.normalizedUrl === url);
    if (matchedTab) {
      if (typeof matchedTab.id !== "number") {
        throw new Error("标签页缺少 TabID");
      }
      if (shouldFocus) {
        await focusTab(matchedTab.id);
      }
      const matchedUrl = matchedTab.url || url,
        isInternal = isInternalUrl(matchedUrl),
        isPdfDocument = isPdfUrl(matchedUrl);
      if (isInternal) {
        const title = matchedTab.title || "";
        return buildOpenPageReadOutput({
          title,
          tabId: matchedTab.id,
          isInternal: true,
        });
      }
      const readPageNumber = isPdfDocument ? pageNumber : 1;
      const pageData = await fetchPageMarkdownData(
        matchedTab.id,
        readPageNumber,
      );
      if (followMode) {
        await syncPageHash(matchedTab.id, pageData);
      }
      return buildOpenPageReadOutput({
        title: pageData.title,
        tabId: matchedTab.id,
        content: pageData.content,
        isInternal: isInternalUrl(pageData.url || matchedUrl),
        pageNumber: pageData.pageNumber,
        totalPages: pageData.totalPages,
      });
    }
    const tab = await createTab(url, shouldFocus);
    if (shouldFocus) {
      await focusTab(tab.id);
    }
    const initialInternal = isInternalUrl(url);
    if (initialInternal) {
      const title = tab.title || "";
      return buildOpenPageReadOutput({
        title,
        tabId: tab.id,
        isInternal: true,
      });
    }
    const readPageNumber = isPdfUrl(url) ? pageNumber : 1,
      pageData = await fetchPageMarkdownData(tab.id, readPageNumber);
    if (followMode) {
      await syncPageHash(tab.id, pageData);
    }
    return buildOpenPageReadOutput({
      title: pageData.title,
      tabId: tab.id,
      content: pageData.content,
      isInternal: isInternalUrl(pageData.url || url),
      pageNumber: pageData.pageNumber,
      totalPages: pageData.totalPages,
    });
  };

export default {
  key: "openBrowserPage",
  name: "open_page",
  description: t("toolOpenPage"),
  parameters,
  validateArgs,
  execute,
};
