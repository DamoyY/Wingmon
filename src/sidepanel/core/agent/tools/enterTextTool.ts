import type {
  EnterTextRequest,
  EnterTextResponse,
} from "../../../../shared/index.ts";
import {
  buildEnterTextMessageContext,
  formatEnterTextResult,
} from "../toolResultFormatters.ts";
import { isInternalUrl, t } from "../../../lib/utils/index.ts";
import type { EnterTextToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { resolveInputTabChunkLocation } from "../pageReadHelpers.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type PageMarkdownData = Awaited<
  ReturnType<ToolExecutionContext["fetchPageMarkdownData"]>
>;

type EnterTextMessage = Exclude<EnterTextResponse, { error: string }>;

type EnterTextArgs = { id: string; content: string; pressEnter: boolean };

const parameters = {
    additionalProperties: false,
    properties: {
      content: { description: t("toolParamContent"), type: "string" },
      id: {
        description: t("toolParamInputId"),
        minLength: 1,
        pattern: "^[0-9a-z]+$",
        type: "string",
      },
      pressEnter: {
        description: t("toolParamPressCtrlEnter"),
        type: "boolean",
      },
    },
    required: ["id", "content", "pressEnter"],
    type: "object",
  },
  isTabConnectable = (tab: BrowserTab): boolean =>
    typeof tab.url !== "string" || !isInternalUrl(tab.url),
  resolveEnterTextReason = (response: EnterTextMessage): string | undefined => {
    if (response.ok) {
      return undefined;
    }
    const normalizedReason = response.reason.trim();
    if (!normalizedReason) {
      throw new Error("enter_text 返回的 reason 无效");
    }
    return normalizedReason;
  },
  execute = async (
    { id, content, pressEnter }: EnterTextArgs,
    context: ToolExecutionContext,
  ): Promise<EnterTextToolResult> => {
    const inputLocation = resolveInputTabChunkLocation(id);
    if (inputLocation === null) {
      console.error(`未找到 id 为 ${id} 的输入框索引，请先读取页面`);
      return { ok: false };
    }
    const tabId = inputLocation.tabId;
    let tabs: BrowserTab[];
    try {
      tabs = await context.getAllTabs();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法查询所有标签页";
      console.error(message);
      return { ok: false };
    }
    if (!tabs.length) {
      console.error("未找到可用标签页");
      return { ok: false };
    }
    const targetTab = tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      console.error(`输入框 id ${id} 的索引标签页不可用，请重新读取页面`);
      return { ok: false };
    }
    if (!isTabConnectable(targetTab)) {
      console.error("索引标签页为浏览器内置页面，无法输入");
      return { ok: false };
    }
    try {
      await context.waitForContentScript(tabId);
      const message: EnterTextRequest = {
          content,
          id,
          pressEnter,
          type: "enterText",
        },
        response: EnterTextMessage = await context.sendMessageToTab(
          tabId,
          message,
        );
      const enterTextResult = {
        ok: response.ok,
        reason: resolveEnterTextReason(response),
      };
      if (!enterTextResult.ok) {
        if (enterTextResult.reason === "not_found") {
          console.error(`未在索引标签页找到 id 为 ${id} 的输入框`);
          return { ok: false };
        }
        console.error("输入返回结果异常", response);
        return { ok: false };
      }
      if (!pressEnter) {
        return { ok: true };
      }
      let pageData: PageMarkdownData;
      try {
        pageData = await context.fetchPageMarkdownData(
          tabId,
          inputLocation.pageNumber,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "页面读取失败";
        console.error("enter_text 读取输入框分片失败，已回退默认分片", {
          errorMessage,
          requestedPageNumber: inputLocation.pageNumber,
        });
        pageData = await context.fetchPageMarkdownData(tabId);
      }
      const resolvedUrl = pageData.url || targetTab.url || "",
        internal = isInternalUrl(resolvedUrl),
        result: EnterTextToolResult = {
          content: internal ? "" : pageData.content,
          isInternal: internal,
          ok: true,
          tabId,
          title: pageData.title,
          url: resolvedUrl,
        };
      if (!internal) {
        result.pageNumber = pageData.pageNumber;
        result.totalPages = pageData.totalPages;
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "输入失败";
      console.error(message);
      return { ok: false };
    }
  };

export default {
  buildMessageContext: buildEnterTextMessageContext,
  description: t("toolEnterText"),
  execute,
  formatResult: formatEnterTextResult,
  key: "enterText",
  name: "enter_text",
  pageReadDedupeAction: "trimToolResponse",
  parameters,
};
