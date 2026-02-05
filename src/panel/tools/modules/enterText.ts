import { t } from "../../utils/index.ts";
import {
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.js";
import { runTabAction } from "./tabActionRunner.ts";

type EnterTextArgs = {
  id: string;
  content: string;
  invalid?: boolean;
  errorMessage?: string;
};

const getAllTabsSafe = getAllTabs as () => Promise<unknown>,
  sendMessageToTabSafe = sendMessageToTab as (
    tabId: number,
    payload: { type: string; id: string; content: string },
  ) => Promise<unknown>,
  waitForContentScriptSafe = waitForContentScript as (
    tabId: number,
  ) => Promise<unknown>;

const parameters = {
    type: "object",
    properties: {
      id: { type: "string", description: t("toolParamInputId") },
      content: { type: "string", description: t("toolParamContent") },
    },
    required: ["id", "content"],
    additionalProperties: false,
  },
  buildInvalidArgs = (message: string): EnterTextArgs => {
    console.error(message);
    return { id: "", content: "", invalid: true, errorMessage: message };
  },
  validateArgs = (args: unknown): EnterTextArgs => {
    if (!args || typeof args !== "object") {
      return buildInvalidArgs("工具参数必须是对象");
    }
    const record = args as Record<string, unknown>,
      id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return buildInvalidArgs("id 必须是非空字符串");
    }
    if (!/^[0-9a-z]+$/i.test(id)) {
      return buildInvalidArgs("id 仅支持字母数字");
    }
    if (typeof record.content !== "string") {
      return buildInvalidArgs("content 必须是字符串");
    }
    return { id, content: record.content };
  },
  resolveTabId = (tab: unknown): number | null => {
    if (!tab || typeof tab !== "object") {
      return null;
    }
    const raw = (tab as { id?: unknown }).id;
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
      return null;
    }
    return raw;
  },
  execute = async ({
    id,
    content,
    invalid,
  }: EnterTextArgs): Promise<string> => {
    if (invalid) {
      return "失败";
    }
    let tabsResult: unknown;
    try {
      tabsResult = await getAllTabsSafe();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法查询所有标签页";
      console.error(message);
      return "失败";
    }
    if (!Array.isArray(tabsResult)) {
      console.error("标签页列表无效");
      return "失败";
    }
    const tabs = tabsResult as unknown[];
    if (!tabs.length) {
      console.error("未找到可用标签页");
      return "失败";
    }
    const finalState = await runTabAction({
      tabs,
      waitForContentScript: waitForContentScriptSafe,
      sendMessage: (tabId) =>
        sendMessageToTabSafe(tabId, {
          type: "enterText",
          id,
          content,
        }),
      invalidResultMessage: "输入返回结果异常",
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "输入失败",
      resolveTabId,
    });
    if (finalState.done) {
      return "成功";
    }
    if (finalState.notFoundCount) {
      console.error(`未在任何标签页找到 id 为 ${id} 的输入框`);
    }
    if (finalState.errors.length) {
      console.error(`输入失败：${finalState.errors.join("；")}`);
    }
    return "失败";
  };

export default {
  key: "enterText",
  name: "enter_text",
  description: t("toolEnterText"),
  parameters,
  validateArgs,
  execute,
};
