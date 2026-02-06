import { isPdfUrl } from "../../../../shared/index.ts";
import { isInternalUrl, t, type JsonValue } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { parsePageNumber } from "../validation/pageNumber.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import {
  buildOpenBrowserPageMessageContext,
  formatOpenBrowserPageResult,
} from "../toolResultFormatters.ts";
import type { OpenBrowserPageToolResult } from "../toolResultTypes.ts";

type OpenPageArgs = {
  url: string;
  focus: boolean;
  pageNumber: number;
};

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

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
  execute = async (
    { url, focus, pageNumber }: OpenPageArgs,
    context: ToolExecutionContext,
  ): Promise<OpenBrowserPageToolResult> => {
    const followMode = await context.shouldFollowMode(),
      shouldFocus = followMode || focus,
      tabs: BrowserTab[] = await context.getAllTabs(),
      normalizedTabs = tabs
        .map(normalizeTab)
        .filter((tab): tab is NormalizedTab => Boolean(tab)),
      matchedTab = normalizedTabs.find((tab) => tab.normalizedUrl === url);
    if (matchedTab) {
      if (typeof matchedTab.id !== "number") {
        throw new Error("标签页缺少 TabID");
      }
      if (shouldFocus) {
        await context.focusTab(matchedTab.id);
      }
      const matchedUrl = matchedTab.url || url,
        isInternal = isInternalUrl(matchedUrl),
        isPdfDocument = isPdfUrl(matchedUrl);
      if (isInternal) {
        return {
          tabId: matchedTab.id,
          title: matchedTab.title || "",
          url: matchedUrl,
          content: "",
          isInternal: true,
        };
      }
      const readPageNumber = isPdfDocument ? pageNumber : 1;
      const pageData = await context.fetchPageMarkdownData(
        matchedTab.id,
        readPageNumber,
      );
      if (followMode) {
        await context.syncPageHash(matchedTab.id, pageData);
      }
      return {
        title: pageData.title,
        tabId: matchedTab.id,
        url: pageData.url || matchedUrl,
        content: pageData.content,
        isInternal: isInternalUrl(pageData.url || matchedUrl),
        pageNumber: pageData.pageNumber,
        totalPages: pageData.totalPages,
      };
    }
    const tab = await context.createTab(url, shouldFocus);
    if (shouldFocus) {
      await context.focusTab(tab.id);
    }
    const initialInternal = isInternalUrl(url);
    if (initialInternal) {
      return {
        tabId: tab.id,
        title: tab.title || "",
        url,
        content: "",
        isInternal: true,
      };
    }
    const readPageNumber = isPdfUrl(url) ? pageNumber : 1,
      pageData = await context.fetchPageMarkdownData(tab.id, readPageNumber);
    if (followMode) {
      await context.syncPageHash(tab.id, pageData);
    }
    return {
      title: pageData.title,
      tabId: tab.id,
      url: pageData.url || url,
      content: pageData.content,
      isInternal: isInternalUrl(pageData.url || url),
      pageNumber: pageData.pageNumber,
      totalPages: pageData.totalPages,
    };
  };

export default {
  key: "openBrowserPage",
  name: "open_page",
  description: t("toolOpenPage"),
  parameters,
  validateArgs,
  execute,
  formatResult: formatOpenBrowserPageResult,
  buildMessageContext: buildOpenBrowserPageMessageContext,
  pageReadDedupeAction: "trimToolResponse",
};
