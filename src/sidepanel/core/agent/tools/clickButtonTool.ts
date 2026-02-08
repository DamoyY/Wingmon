import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../../../shared/index.ts";
import { type JsonValue, isInternalUrl, t } from "../../../lib/utils/index.ts";
import {
  buildClickButtonMessageContext,
  formatClickButtonResult,
} from "../toolResultFormatters.ts";
import type { ClickButtonToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import { runTabAction } from "./tabActionRunner.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];
type PageMarkdownData = Awaited<
  ReturnType<ToolExecutionContext["fetchPageMarkdownData"]>
>;

type ClickButtonArgs = {
  id: string;
};

const clickPageReadDelayMs = 500,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    }),
  resolveClickButtonPageNumber = (
    response: ClickButtonResponse,
  ): number | undefined => {
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
    properties: { id: { description: t("toolParamId"), type: "string" } },
    required: ["id"],
    type: "object",
  },
  validateArgs = (args: JsonValue): ClickButtonArgs => {
    const record = ensureObjectArgs(args);
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      throw new ToolInputError("id 必须是非空字符串");
    }
    if (!/^[0-9a-z]+$/i.test(id)) {
      throw new ToolInputError("id 仅支持字母数字");
    }
    return { id };
  },
  execute = async (
    { id }: ClickButtonArgs,
    context: ToolExecutionContext,
  ): Promise<ClickButtonToolResult> => {
    const tabs: BrowserTab[] = await context.getAllTabs();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const finalState = await runTabAction({
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "点击失败",
      invalidResultMessage: "按钮点击返回结果异常",
      onSuccess: async (tabId, clickResult) => {
        await waitForDelay(clickPageReadDelayMs);
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
        const matchedTab = tabs.find((tab) => tab.id === tabId),
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
        const response: ClickButtonResponse = candidate;
        return {
          ok: response.ok,
          pageNumber: resolveClickButtonPageNumber(response),
          reason: response.error,
        };
      },
      sendMessage: (tabId) => {
        const message: ClickButtonRequest = {
          id,
          type: "clickButton",
        };
        return context.sendMessageToTab(tabId, message);
      },
      tabs,
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
  validateArgs,
};
