import { isInternalUrl, t } from "../../../lib/utils/index.ts";
import type { EnterTextRequest } from "../../../../shared/index.ts";
import type { EnterTextToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { formatEnterTextResult } from "../toolResultFormatters.ts";
import { runTabAction } from "./tabActionRunner.ts";

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
  resolveTabId = (tab: BrowserTab): number | null => {
    if (
      typeof tab.id !== "number" ||
      !Number.isInteger(tab.id) ||
      tab.id <= 0
    ) {
      return null;
    }
    return tab.id;
  },
  isTabConnectable = (tab: BrowserTab): boolean =>
    typeof tab.url !== "string" || !isInternalUrl(tab.url),
  execute = async (
    { id, content }: EnterTextArgs,
    context: ToolExecutionContext,
  ): Promise<EnterTextToolResult> => {
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
    const connectableTabs = tabs.filter(isTabConnectable);
    if (!connectableTabs.length) {
      console.error("当前仅有浏览器内置页面，无法输入");
      return { ok: false };
    }
    const finalState = await runTabAction({
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "输入失败",
      invalidResultMessage: "输入返回结果异常",
      resolveTabId,
      sendMessage: (tabId) => {
        const message: EnterTextRequest = { content, id, type: "enterText" };
        return context.sendMessageToTab(tabId, message);
      },
      tabs: connectableTabs,
      waitForContentScript: context.waitForContentScript,
    });
    if (finalState.done) {
      return { ok: true };
    }
    if (finalState.notFoundCount) {
      console.error(`未在任何标签页找到 id 为 ${id} 的输入框`);
    }
    if (finalState.errors.length) {
      console.error(`输入失败：${finalState.errors.join("；")}`);
    }
    return { ok: false };
  };

export default {
  description: t("toolEnterText"),
  execute,
  formatResult: formatEnterTextResult,
  key: "enterText",
  name: "enter_text",
  parameters,
};
