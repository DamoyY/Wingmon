import { isInternalUrl, t, type JsonValue } from "../../utils/index.ts";
import type { ClickButtonRequest } from "../../../shared/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import {
  buildClickButtonMessageContext,
  formatClickButtonResult,
} from "../toolResultFormatters.ts";
import type { ClickButtonToolResult } from "../toolResultTypes.ts";
import { runTabAction } from "./tabActionRunner.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type ClickButtonArgs = {
  id: string;
};

const clickPageReadDelayMs = 500,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const parameters = {
    type: "object",
    properties: { id: { type: "string", description: t("toolParamId") } },
    required: ["id"],
    additionalProperties: false,
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
      tabs,
      waitForContentScript: context.waitForContentScript,
      sendMessage: (tabId) => {
        const message: ClickButtonRequest = {
          type: "clickButton",
          id,
        };
        return context.sendMessageToTab(tabId, message);
      },
      invalidResultMessage: "按钮点击返回结果异常",
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "点击失败",
      onSuccess: async (tabId) => {
        await waitForDelay(clickPageReadDelayMs);
        const pageData = await context.fetchPageMarkdownData(tabId),
          matchedTab = tabs.find((tab) => tab.id === tabId),
          resolvedUrl = pageData.url || matchedTab?.url || "",
          internal = isInternalUrl(resolvedUrl),
          result: ClickButtonToolResult = {
            tabId,
            title: pageData.title,
            url: resolvedUrl,
            content: internal ? "" : pageData.content,
            isInternal: internal,
          };
        if (!internal) {
          result.pageNumber = pageData.pageNumber;
          result.totalPages = pageData.totalPages;
        }
        return result;
      },
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
  key: "clickButton",
  name: "click_button",
  description: t("toolClickButton"),
  parameters,
  validateArgs,
  execute,
  formatResult: formatClickButtonResult,
  buildMessageContext: buildClickButtonMessageContext,
  pageReadDedupeAction: "trimToolResponse",
};
