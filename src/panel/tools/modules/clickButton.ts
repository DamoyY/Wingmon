import { isInternalUrl, t, type JsonValue } from "../../utils/index.ts";
import {
  type BrowserTab,
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/toolArgsValidation.ts";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
} from "../pageReadHelpers.ts";
import { runTabAction } from "./tabActionRunner.ts";

type ClickButtonArgs = {
  id: string;
};

type ClickButtonOutputArgs = {
  title: string;
  content?: string;
  isInternal: boolean;
};

type ClickButtonMessage = {
  type: "clickButton";
  id: string;
};

type ClickButtonResult = {
  content: string;
  pageReadTabId: number;
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
  buildClickButtonOutput = ({
    title,
    content = "",
    isInternal,
  }: ClickButtonOutputArgs): string =>
    buildPageReadResult({
      headerLines: [
        t("statusClickSuccess"),
        `${t("statusTitle")}："${title}"；`,
      ],
      contentLabel: `${t("statusContent")}：`,
      content,
      isInternal,
    }),
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
  execute = async ({ id }: ClickButtonArgs): Promise<ClickButtonResult> => {
    const tabs: BrowserTab[] = await getAllTabs();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const finalState = await runTabAction({
      tabs,
      waitForContentScript,
      sendMessage: (tabId) => {
        const message: ClickButtonMessage = {
          type: "clickButton",
          id,
        };
        return sendMessageToTab(tabId, message);
      },
      invalidResultMessage: "按钮点击返回结果异常",
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "点击失败",
      onSuccess: async (tabId) => {
        await waitForDelay(clickPageReadDelayMs);
        const { title, url, content } = await fetchPageMarkdownData(tabId),
          matchedTab = tabs.find((tab) => tab.id === tabId),
          internalUrl = url || matchedTab?.url || "";
        return buildClickButtonOutput({
          title,
          content,
          isInternal: isInternalUrl(internalUrl),
        });
      },
    });
    if (finalState.done) {
      if (!finalState.result || !finalState.tabId) {
        console.error("按钮点击结果缺少内容", finalState);
        throw new Error("按钮点击结果无效");
      }
      return { content: finalState.result, pageReadTabId: finalState.tabId };
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
};
