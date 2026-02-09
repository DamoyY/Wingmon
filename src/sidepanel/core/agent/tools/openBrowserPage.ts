import { type JsonValue, isInternalUrl, t } from "../../../lib/utils/index.ts";
import {
  buildOpenBrowserPageMessageContext,
  formatOpenBrowserPageResult,
} from "../toolResultFormatters.ts";
import type { OpenBrowserPageToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import { extractErrorMessage } from "../../../../shared/index.ts";

type OpenPageArgs = {
  url: string;
  focus: boolean;
};

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type NormalizedTab = BrowserTab & {
  normalizedUrl: string;
};

const parameters = {
    additionalProperties: false,
    properties: {
      focus: { description: t("toolParamFocus"), type: "boolean" },
      url: { type: "string" },
    },
    required: ["url", "focus"],
    type: "object",
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
      throw new ToolInputError("URL 必须是非空字符串");
    }
    if (typeof rawArgs.focus !== "boolean") {
      throw new ToolInputError("focus 必须是布尔值");
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawArgs.url);
    } catch (error) {
      console.error("URL 格式不正确", error);
      throw new ToolInputError("URL 格式不正确");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ToolInputError("URL 仅支持 http 或 https");
    }
    return { focus: rawArgs.focus, url: parsedUrl.toString() };
  },
  fetchPageResult = async ({
    context,
    followMode,
    tabId,
    fallbackUrl,
    requestedUrl,
  }: {
    context: ToolExecutionContext;
    followMode: boolean;
    tabId: number;
    fallbackUrl: string;
    requestedUrl: string;
  }): Promise<OpenBrowserPageToolResult> => {
    try {
      const pageData = await context.fetchPageMarkdownData(tabId, 1);
      if (followMode) {
        await context.syncPageHash(tabId, pageData);
      }
      return {
        content: pageData.content,
        isInternal: isInternalUrl(pageData.url || fallbackUrl),
        pageNumber: pageData.pageNumber,
        tabId,
        title: pageData.title,
        totalPages: pageData.totalPages,
        url: pageData.url || fallbackUrl,
      };
    } catch (error) {
      const message = extractErrorMessage(error, {
        fallback: "页面内容获取失败",
        includeNonStringPrimitives: true,
      });
      console.error(
        "open_page 页面读取失败",
        { message, requestedUrl, tabId },
        error,
      );
      throw new ToolInputError(message, { tabId });
    }
  },
  execute = async (
    { url, focus }: OpenPageArgs,
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
        throw new Error("标签页缺少 Tab ID");
      }
      if (shouldFocus) {
        await context.focusTab(matchedTab.id);
      }
      const matchedUrl = matchedTab.url || url,
        isInternal = isInternalUrl(matchedUrl);
      if (isInternal) {
        return {
          content: "",
          isInternal: true,
          tabId: matchedTab.id,
          title: matchedTab.title || "",
          url: matchedUrl,
        };
      }
      return fetchPageResult({
        context,
        fallbackUrl: matchedUrl,
        followMode,
        requestedUrl: url,
        tabId: matchedTab.id,
      });
    }
    const tab = await context.createTab(url, shouldFocus);
    if (shouldFocus) {
      await context.focusTab(tab.id);
    }
    const initialInternal = isInternalUrl(url);
    if (initialInternal) {
      return {
        content: "",
        isInternal: true,
        tabId: tab.id,
        title: tab.title || "",
        url,
      };
    }
    return fetchPageResult({
      context,
      fallbackUrl: url,
      followMode,
      requestedUrl: url,
      tabId: tab.id,
    });
  };

export default {
  buildMessageContext: buildOpenBrowserPageMessageContext,
  description: t("toolOpenPage"),
  execute,
  formatResult: formatOpenBrowserPageResult,
  key: "openBrowserPage",
  name: "open_page",
  pageReadDedupeAction: "trimToolResponse",
  parameters,
  validateArgs,
};
