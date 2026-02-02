import { isInternalUrl, t } from "../../utils/index.js";
import {
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.js";
import ToolInputError from "../errors.js";
import {
  buildPageReadResult,
  ensureObjectArgs,
  fetchPageMarkdownData,
} from "./toolModuleUtils.js";

const parameters = {
  type: "object",
  properties: { id: { type: "string", description: t("toolParamId") } },
  required: ["id"],
  additionalProperties: false,
};

const buildClickButtonOutput = ({ title, content = "", isInternal }) =>
  buildPageReadResult({
    headerLines: [t("statusClickSuccess"), `${t("statusTitle")}："${title}"；`],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal,
  });

const validateArgs = (args) => {
  ensureObjectArgs(args);
  if (typeof args.id !== "string" || !args.id.trim()) {
    throw new ToolInputError("id 必须是非空字符串");
  }
  return { id: args.id.trim() };
};

const execute = async ({ id }) => {
  const tabs = await getAllTabs();
  if (!tabs.length) {
    throw new Error("未找到可用标签页");
  }
  const initialState = {
    errors: [],
    notFoundCount: 0,
    done: false,
    result: "",
  };
  const finalState = await tabs.reduce(async (promise, tab) => {
    const state = await promise;
    if (state.done) {
      return state;
    }
    if (typeof tab.id !== "number") {
      return { ...state, errors: [...state.errors, "标签页缺少 TabID"] };
    }
    try {
      await waitForContentScript(tab.id);
      const result = await sendMessageToTab(tab.id, {
        type: "clickButton",
        id,
      });
      if (result?.ok) {
        const { title, url, content } = await fetchPageMarkdownData(tab.id);
        const internalUrl = url || tab.url || "";
        return {
          ...state,
          done: true,
          result: buildClickButtonOutput({
            title,
            content,
            isInternal: isInternalUrl(internalUrl),
          }),
          tabId: tab.id,
        };
      }
      if (result?.ok === false && result.reason === "not_found") {
        return { ...state, notFoundCount: state.notFoundCount + 1 };
      }
      throw new Error("按钮点击返回结果异常");
    } catch (error) {
      const message = error?.message || "点击失败";
      return {
        ...state,
        errors: [...state.errors, `TabID ${tab.id}: ${message}`],
      };
    }
  }, Promise.resolve(initialState));
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
