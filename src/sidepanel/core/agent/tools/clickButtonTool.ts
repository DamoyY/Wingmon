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
import { runTabAction } from "./tabActionRunner.ts";

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
    const tabs: BrowserTab[] = await context.getAllTabs();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const connectableTabs = tabs.filter(isTabConnectable);
    if (!connectableTabs.length) {
      throw new Error("当前仅有浏览器内置页面，无法点击按钮");
    }
    const finalState = await runTabAction({
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "点击失败",
      invalidResultMessage: "按钮点击返回结果异常",
      onSuccess: async (tabId, clickResult) => {
        const requestedPageNumber = clickResult.pageNumber;
        if (requestedPageNumber === undefined) {
          console.error("click_button 未返回按钮分片页码，已回退为默认分片");
        }
        let pageData: PageMarkdownData;
        try {
          pageData = await context.fetchPageMarkdownData(
            tabId,
            requestedPageNumber,
          );
        } catch (error) {
          if (requestedPageNumber === undefined) {
            throw error;
          }
          const errorMessage =
            error instanceof Error ? error.message : "页面读取失败";
          console.error("click_button 读取按钮分片失败，已回退默认分片", {
            errorMessage,
            requestedPageNumber,
          });
          pageData = await context.fetchPageMarkdownData(tabId);
        }
        const matchedTab = connectableTabs.find((tab) => tab.id === tabId),
          resolvedUrl = pageData.url || matchedTab?.url || "",
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
      },
      resolveResult: (candidate) => {
        const response: ClickButtonMessage = candidate;
        return {
          ok: response.ok,
          pageNumber: resolveClickButtonPageNumber(response),
          reason: resolveClickButtonReason(response),
        };
      },
      sendMessage: (tabId) => {
        const message: ClickButtonRequest = {
          id,
          type: "clickButton",
        };
        return context.sendMessageToTab(tabId, message);
      },
      tabs: connectableTabs,
      waitForContentScript: context.waitForContentScript,
    });
    if (finalState.done) {
      if (!finalState.result) {
        console.error("按钮点击结果缺少内容", finalState);
        throw new Error("按钮点击结果无效");
      }
      return finalState.result;
    }
    if (finalState.errors.length) {
      if (finalState.notFoundCount) {
        throw new Error(
          `未在任何标签页找到 id 为 ${id} 的按钮，且部分标签页发生错误：${finalState.errors.join("；")}`,
        );
      }
      throw new Error(`所有标签页点击失败：${finalState.errors.join("；")}`);
    }
    throw new Error(`未找到 id 为 ${id} 的按钮`);
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
