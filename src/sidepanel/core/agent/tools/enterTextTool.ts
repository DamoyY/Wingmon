import { isInternalUrl, t } from "../../../lib/utils/index.ts";
import type { EnterTextRequest } from "../../../../shared/index.ts";
import type { EnterTextToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { formatEnterTextResult } from "../toolResultFormatters.ts";
import { resolveInputTabChunkLocation } from "../pageReadHelpers.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type EnterTextArgs = { id: string; content: string };

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
    },
    required: ["id", "content"],
    type: "object",
  },
  isTabConnectable = (tab: BrowserTab): boolean =>
    typeof tab.url !== "string" || !isInternalUrl(tab.url),
  execute = async (
    { id, content }: EnterTextArgs,
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
      const message: EnterTextRequest = { content, id, type: "enterText" },
        response = await context.sendMessageToTab(tabId, message);
      if (response.ok) {
        return { ok: true };
      }
      if (response.ok === false && response.reason === "not_found") {
        console.error(`未在索引标签页找到 id 为 ${id} 的输入框`);
        return { ok: false };
      }
      console.error("输入返回结果异常", response);
      return { ok: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "输入失败";
      console.error(message);
      return { ok: false };
    }
  };

export default {
  description: t("toolEnterText"),
  execute,
  formatResult: formatEnterTextResult,
  key: "enterText",
  name: "enter_text",
  parameters,
};
