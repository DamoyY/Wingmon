import {
  buildOpenBrowserPageMessageContext,
  formatOpenBrowserPageResult,
} from "../toolResultFormatters.ts";
import {
  isInternalUrl,
  resolveSupportedImageMimeType,
  t,
} from "../../../lib/utils/index.ts";
import {
  resolvePageImageInput,
  resolvePageImageInputFromMarkdown,
} from "../pageReadHelpers.ts";
import type { OpenBrowserPageToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
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
      url: { minLength: 1, pattern: "\\S", type: "string" },
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
  resolveHttpUrl = (url: string, supportsImageInput: boolean): string => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      console.error("URL 格式不正确", error);
      throw new ToolInputError("URL 格式不正确");
    }
    if (parsedUrl.protocol === "file:") {
      if (!supportsImageInput) {
        throw new ToolInputError("URL 仅支持 http、https");
      }
      if (resolveSupportedImageMimeType(parsedUrl.toString()) === null) {
        throw new ToolInputError("file:// URL 仅支持 PNG、JPEG、WebP 图片");
      }
      return parsedUrl.toString();
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      if (supportsImageInput) {
        throw new ToolInputError("URL 仅支持 http、https，或 file:// 图片");
      }
      throw new ToolInputError("URL 仅支持 http、https");
    }
    return parsedUrl.toString();
  },
  resolveImagePageResult = async ({
    tabId,
    title,
    url,
  }: {
    tabId: number;
    title: string;
    url: string;
  }): Promise<OpenBrowserPageToolResult | null> => {
    const imageInput = await resolvePageImageInput(url);
    if (imageInput === null) {
      return null;
    }
    return {
      content: "",
      imageInput,
      isInternal: false,
      pageNumber: 1,
      tabId,
      title,
      totalPages: 1,
      url,
    };
  },
  fetchPageResult = async ({
    context,
    followMode,
    supportsImageInput,
    tabId,
    fallbackUrl,
    requestedUrl,
  }: {
    context: ToolExecutionContext;
    followMode: boolean;
    supportsImageInput: boolean;
    tabId: number;
    fallbackUrl: string;
    requestedUrl: string;
  }): Promise<OpenBrowserPageToolResult> => {
    try {
      const pageData = await context.fetchPageMarkdownData(tabId, 1);
      if (followMode) {
        await context.syncPageHash(tabId, pageData);
      }
      const resolvedUrl = pageData.url || fallbackUrl;
      if (supportsImageInput) {
        const imageInput = await resolvePageImageInputFromMarkdown(
          pageData.content,
          resolvedUrl,
        );
        if (imageInput !== null) {
          return {
            content: "",
            imageInput,
            isInternal: false,
            pageNumber: 1,
            tabId,
            title: pageData.title,
            totalPages: 1,
            url: resolvedUrl,
          };
        }
      }
      return {
        content: pageData.content,
        isInternal: isInternalUrl(resolvedUrl),
        pageNumber: pageData.pageNumber,
        tabId,
        title: pageData.title,
        totalPages: pageData.totalPages,
        url: resolvedUrl,
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
    const apiType = await context.getApiType(),
      supportsImageInput = apiType !== "chat",
      normalizedUrl = resolveHttpUrl(url, supportsImageInput);
    const followMode = await context.shouldFollowMode(),
      shouldFocus = followMode || focus,
      tabs: BrowserTab[] = await context.getAllTabs(),
      normalizedTabs = tabs
        .map(normalizeTab)
        .filter((tab): tab is NormalizedTab => Boolean(tab)),
      matchedTab = normalizedTabs.find(
        (tab) => tab.normalizedUrl === normalizedUrl,
      );
    if (matchedTab) {
      if (typeof matchedTab.id !== "number") {
        throw new Error("标签页缺少 Tab ID");
      }
      if (shouldFocus) {
        await context.focusTab(matchedTab.id);
      }
      const matchedUrl = matchedTab.url || normalizedUrl,
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
      if (supportsImageInput) {
        const imageResult = await resolveImagePageResult({
          tabId: matchedTab.id,
          title: matchedTab.title || "",
          url: matchedUrl,
        });
        if (imageResult !== null) {
          return imageResult;
        }
      }
      return fetchPageResult({
        context,
        fallbackUrl: matchedUrl,
        followMode,
        requestedUrl: normalizedUrl,
        supportsImageInput,
        tabId: matchedTab.id,
      });
    }
    const tab = await context.createTab(normalizedUrl, shouldFocus);
    if (shouldFocus) {
      await context.focusTab(tab.id);
    }
    const initialInternal = isInternalUrl(normalizedUrl);
    if (initialInternal) {
      return {
        content: "",
        isInternal: true,
        tabId: tab.id,
        title: tab.title || "",
        url: normalizedUrl,
      };
    }
    if (supportsImageInput) {
      const imageResult = await resolveImagePageResult({
        tabId: tab.id,
        title: tab.title || "",
        url: normalizedUrl,
      });
      if (imageResult !== null) {
        return imageResult;
      }
    }
    return fetchPageResult({
      context,
      fallbackUrl: normalizedUrl,
      followMode,
      requestedUrl: normalizedUrl,
      supportsImageInput,
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
};
