import { t, type JsonValue } from "../../utils/index.ts";
import {
  type BrowserTab,
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import { runTabAction } from "./tabActionRunner.ts";

type EnterTextArgs = {
  id: string;
  content: string;
  invalid?: boolean;
  errorMessage?: string;
};

type EnterTextMessage = {
  type: "enterText";
  id: string;
  content: string;
};

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
    return { id, content: record.content };
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
  execute = async ({
    id,
    content,
    invalid,
  }: EnterTextArgs): Promise<string> => {
    if (invalid) {
      return "失败";
    }
    let tabs: BrowserTab[];
    try {
      tabs = await getAllTabs();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法查询所有标签页";
      console.error(message);
      return "失败";
    }
    if (!tabs.length) {
      console.error("未找到可用标签页");
      return "失败";
    }
    const finalState = await runTabAction({
      tabs,
      waitForContentScript,
      sendMessage: (tabId) => {
        const message: EnterTextMessage = {
          type: "enterText",
          id,
          content,
        };
        return sendMessageToTab(tabId, message);
      },
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
