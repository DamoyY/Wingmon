import { type JsonValue, t } from "../../../lib/utils/index.ts";
import type { EnterTextRequest } from "../../../../shared/index.ts";
import type { EnterTextToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import { formatEnterTextResult } from "../toolResultFormatters.ts";
import { runTabAction } from "./tabActionRunner.ts";

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

type EnterTextArgs = { id: string; content: string; invalid?: boolean };

const parameters = {
    additionalProperties: false,
    properties: {
      content: { description: t("toolParamContent"), type: "string" },
      id: { description: t("toolParamInputId"), type: "string" },
    },
    required: ["id", "content"],
    type: "object",
  },
  buildInvalidArgs = (message: string): EnterTextArgs => {
    console.error(message);
    return { content: "", id: "", invalid: true };
  },
  validateArgs = (args: JsonValue): EnterTextArgs => {
    let record: ReturnType<typeof ensureObjectArgs>;
    try {
      record = ensureObjectArgs(args);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "工具参数必须是对象";
      return buildInvalidArgs(message);
    }
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return buildInvalidArgs("id 必须是非空字符串");
    }
    if (!/^[0-9a-z]+$/i.test(id)) {
      return buildInvalidArgs("id 仅支持字母数字");
    }
    if (typeof record.content !== "string") {
      return buildInvalidArgs("content 必须是字符串");
    }
    return { content: record.content, id };
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
  execute = async (
    { id, content, invalid }: EnterTextArgs,
    context: ToolExecutionContext,
  ): Promise<EnterTextToolResult> => {
    if (invalid) {
      return { ok: false };
    }
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
    const finalState = await runTabAction({
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "输入失败",
      invalidResultMessage: "输入返回结果异常",
      resolveTabId,
      sendMessage: (tabId) => {
        const message: EnterTextRequest = { content, id, type: "enterText" };
        return context.sendMessageToTab(tabId, message);
      },
      tabs,
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
  validateArgs,
};
