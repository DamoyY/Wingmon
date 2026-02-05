import { isInternalUrl, t } from "../../utils/index.ts";
import {
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs } from "../validation/index.js";
import { buildPageReadResult, fetchPageMarkdownData } from "../pageRead.ts";
import { runTabAction } from "./tabAction.ts";

const parameters = {
    type: "object",
    properties: { id: { type: "string", description: t("toolParamId") } },
    required: ["id"],
    additionalProperties: false,
  },
  buildClickButtonOutput = ({ title, content = "", isInternal }) =>
    buildPageReadResult({
      headerLines: [
        t("statusClickSuccess"),
        `${t("statusTitle")}："${title}"；`,
      ],
      contentLabel: `${t("statusContent")}：`,
      content,
      isInternal,
    }),
  validateArgs = (args) => {
    ensureObjectArgs(args);
    if (typeof args.id !== "string" || !args.id.trim()) {
      throw new ToolInputError("id 必须是非空字符串");
    }
    return { id: args.id.trim() };
  },
  execute = async ({ id }) => {
    const tabs = await getAllTabs();
    if (!tabs.length) {
      throw new Error("未找到可用标签页");
    }
    const finalState = await runTabAction({
      tabs,
      waitForContentScript,
      sendMessage: (tabId) =>
        sendMessageToTab(tabId, {
          type: "clickButton",
          id,
        }),
      invalidResultMessage: "按钮点击返回结果异常",
      buildErrorMessage: (error) => error?.message || "点击失败",
      onSuccess: async (tabId) => {
        const { title, url, content } = await fetchPageMarkdownData(tabId),
          matchedTab = tabs.find((tab) => tab?.id === tabId),
          internalUrl = url || matchedTab?.url || "";
        return buildClickButtonOutput({
          title,
          content,
          isInternal: isInternalUrl(internalUrl),
        });
      },
    });
    if (finalState.done) {
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
