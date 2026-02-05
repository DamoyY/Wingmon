import { isInternalUrl, t } from "../../utils/index.ts";
import {
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs } from "../validation/index.js";
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

type TabLike = {
  id?: number;
  url?: string;
};

type PageMarkdownData = {
  title: string;
  url: string;
  content: string;
};

type ClickButtonResult = {
  content: string;
  pageReadTabId: number;
};

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor,
  tSafe: (key: string) => string = t as (key: string) => string,
  isInternalUrlSafe: (url: string) => boolean = isInternalUrl as (
    url: string,
  ) => boolean,
  ensureObjectArgsSafe: (args: unknown) => void = ensureObjectArgs as (
    args: unknown,
  ) => void,
  getAllTabsSafe: () => Promise<TabLike[]> = getAllTabs as () => Promise<
    TabLike[]
  >,
  sendMessageToTabSafe: (
    tabId: number,
    payload: ClickButtonMessage,
  ) => Promise<unknown> = sendMessageToTab as (
    tabId: number,
    payload: ClickButtonMessage,
  ) => Promise<unknown>,
  waitForContentScriptSafe: (tabId: number) => Promise<unknown> =
    waitForContentScript as (tabId: number) => Promise<unknown>,
  fetchPageMarkdownDataSafe: (tabId: number) => Promise<PageMarkdownData> =
    fetchPageMarkdownData as (tabId: number) => Promise<PageMarkdownData>;

const clickPageReadDelayMs = 500,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const parameters = {
    type: "object",
    properties: { id: { type: "string", description: tSafe("toolParamId") } },
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
        tSafe("statusClickSuccess"),
        `${tSafe("statusTitle")}："${title}"；`,
      ],
      contentLabel: `${tSafe("statusContent")}：`,
      content,
      isInternal,
    }),
  validateArgs = (args: unknown): ClickButtonArgs => {
    ensureObjectArgsSafe(args);
    const record = args as Record<string, unknown>,
      id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      throw new ToolInputErrorSafe("id 必须是非空字符串");
    }
    if (!/^[0-9a-z]+$/i.test(id)) {
      throw new ToolInputErrorSafe("id 仅支持字母数字");
    }
    return { id };
  },
  execute = async ({ id }: ClickButtonArgs): Promise<ClickButtonResult> => {
    const tabs = await getAllTabsSafe();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const finalState = await runTabAction({
      tabs,
      waitForContentScript: waitForContentScriptSafe,
      sendMessage: (tabId) =>
        sendMessageToTabSafe(tabId, {
          type: "clickButton",
          id,
        }),
      invalidResultMessage: "按钮点击返回结果异常",
      buildErrorMessage: (error) =>
        error instanceof Error ? error.message : "点击失败",
      onSuccess: async (tabId) => {
        await waitForDelay(clickPageReadDelayMs);
        const { title, url, content } = await fetchPageMarkdownDataSafe(tabId),
          matchedTab = tabs.find((tab) => tab.id === tabId),
          internalUrl = url || matchedTab?.url || "";
        return buildClickButtonOutput({
          title,
          content,
          isInternal: isInternalUrlSafe(internalUrl),
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
  description: tSafe("toolClickButton"),
  parameters,
  validateArgs,
  execute,
};
