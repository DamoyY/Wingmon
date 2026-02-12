import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../../../shared/index.ts";
import {
  buildClickButtonMessageContext,
  formatClickButtonResult,
} from "../toolResultFormatters.ts";
import { isInternalUrl, t } from "../../../lib/utils/index.ts";
import type { ClickButtonToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { resolveButtonTabChunkLocation } from "../pageReadHelpers.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];
type PageMarkdownData = Awaited<
  ReturnType<ToolExecutionContext["fetchPageMarkdownData"]>
>;
type ClickButtonMessage = Exclude<ClickButtonResponse, { error: string }>;

type ClickButtonArgs = {
  id: string;
};

const isTabConnectable = (tab: BrowserTab): boolean =>
    typeof tab.url !== "string" || !isInternalUrl(tab.url),
  resolveClickButtonReason = (
    response: ClickButtonMessage,
  ): string | undefined => {
    if (response.ok) {
      return undefined;
    }
    const normalizedReason = response.reason.trim();
    if (!normalizedReason) {
      throw new Error("click_button 返回的 reason 无效");
    }
    return normalizedReason;
  },
  resolveClickButtonPageNumber = (
    response: ClickButtonMessage,
  ): number | undefined => {
    if (!response.ok) {
      return undefined;
    }
    const { pageNumber } = response;
    if (pageNumber === undefined) {
      return undefined;
    }
    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      throw new Error("click_button 返回的 pageNumber 无效");
    }
    return pageNumber;
  };

const parameters = {
    additionalProperties: false,
    properties: {
      id: {
        description: t("toolParamId"),
        minLength: 1,
        pattern: "^[0-9a-z]+$",
        type: "string",
      },
    },
    required: ["id"],
    type: "object",
  },
  execute = async (
    { id }: ClickButtonArgs,
    context: ToolExecutionContext,
  ): Promise<ClickButtonToolResult> => {
    const buttonLocation = resolveButtonTabChunkLocation(id);
    if (buttonLocation === null) {
      throw new Error(`未找到 id 为 ${id} 的按钮索引，请先读取页面`);
    }
    const tabs: BrowserTab[] = await context.getAllTabs();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const targetTab = tabs.find((tab) => tab.id === buttonLocation.tabId);
    if (!targetTab) {
      throw new Error(`按钮 id ${id} 的索引标签页不可用，请重新读取页面`);
    }
    if (!isTabConnectable(targetTab)) {
      throw new Error("索引标签页为浏览器内置页面，无法点击按钮");
    }
    const tabId = buttonLocation.tabId;
    await context.waitForContentScript(tabId);
    const message: ClickButtonRequest = {
      id,
      type: "clickButton",
    };
    const response: ClickButtonMessage = await context.sendMessageToTab(
      tabId,
      message,
    );
    const clickResult = {
      ok: response.ok,
      pageNumber: resolveClickButtonPageNumber(response),
      reason: resolveClickButtonReason(response),
    };
    if (!clickResult.ok) {
      if (clickResult.reason === "not_found") {
        throw new Error(`未在索引标签页找到 id 为 ${id} 的按钮`);
      }
      throw new Error("按钮点击返回结果异常");
    }
    const requestedPageNumber =
      clickResult.pageNumber ?? buttonLocation.pageNumber;
    if (clickResult.pageNumber === undefined) {
      console.error("click_button 未返回按钮分片页码，已使用按钮索引分片", {
        indexedPageNumber: buttonLocation.pageNumber,
        tabId,
      });
    }
    let pageData: PageMarkdownData;
    try {
      pageData = await context.fetchPageMarkdownData(
        tabId,
        requestedPageNumber,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "页面读取失败";
      console.error("click_button 读取按钮分片失败，已回退默认分片", {
        errorMessage,
        requestedPageNumber,
      });
      pageData = await context.fetchPageMarkdownData(tabId);
    }
    const resolvedUrl = pageData.url || targetTab.url || "",
      internal = isInternalUrl(resolvedUrl),
      result: ClickButtonToolResult = {
        content: internal ? "" : pageData.content,
        isInternal: internal,
        tabId,
        title: pageData.title,
        url: resolvedUrl,
      };
    if (!internal) {
      result.pageNumber = pageData.pageNumber;
      result.totalPages = pageData.totalPages;
    }
    return result;
  };

export default {
  buildMessageContext: buildClickButtonMessageContext,
  description: t("toolClickButton"),
  execute,
  formatResult: formatClickButtonResult,
  key: "clickButton",
  name: "click_button",
  pageReadDedupeAction: "trimToolResponse",
  parameters,
};
