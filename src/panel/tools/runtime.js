import { setText, statusEl } from "../ui/index.js";
import { addMessage } from "../state/index.js";
import { convertPageContentToMarkdown } from "../markdown/index.js";
import { isInternalUrl } from "../utils/index.js";
import {
  toolNames,
  parseToolArguments,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  validateOpenPageArgs,
  validateClickButtonArgs,
  validateGetPageMarkdownArgs,
  validateClosePageArgs,
  validateConsoleArgs,
  validateListTabsArgs,
} from "./definitions.js";
import {
  closeTab,
  createTab,
  getAllTabs,
  sendMessageToSandbox,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.js";

const normalizeToolCall = (toolCall) => {
  if (!toolCall) {
    return null;
  }
  if (toolCall.function) {
    const { id } = toolCall;
    const name = toolCall.function?.name;
    const args = getToolCallArguments(toolCall);
    if (!id || !name) {
      return null;
    }
    return { id, call_id: toolCall.call_id || id, name, arguments: args };
  }
  if (toolCall.name) {
    const callId = toolCall.call_id || toolCall.id;
    if (!callId) {
      return null;
    }
    return {
      id: callId,
      call_id: callId,
      name: toolCall.name,
      arguments: toolCall.arguments ?? "",
    };
  }
  return null;
};
const fetchPageMarkdownData = async (tabId) => {
  await waitForContentScript(tabId);
  const pageData = await sendMessageToTab(tabId, { type: "getPageContent" });
  return convertPageContentToMarkdown(pageData);
};
const formatPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  internalUrl,
}) => {
  const header = headerLines.join("\n");
  if (isInternalUrl(internalUrl)) {
    return `${header}\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};
const executeOpenBrowserPage = async (args) => {
  const { url, focus } = validateOpenPageArgs(args);
  const tabs = await getAllTabs();
  const normalizedTabs = tabs.map((tab) => {
    if (typeof tab.url !== "string" || !tab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    return { ...tab, normalizedUrl: new URL(tab.url).toString() };
  });
  const matchedTab = normalizedTabs.find((tab) => tab.normalizedUrl === url);
  if (matchedTab) {
    if (typeof matchedTab.id !== "number") {
      throw new Error("标签页缺少 TabID");
    }
    return `失败，浏览器中已存在相同页面，TabID："${matchedTab.id}"`;
  }
  const tab = await createTab(url, focus);
  if (isInternalUrl(url)) {
    const title = tab.title || "";
    return `**打开成功**\n标题："${title}"；\nTabID: "${tab.id}"；\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  const { title, url: pageUrl, content } = await fetchPageMarkdownData(tab.id);
  return formatPageReadResult({
    headerLines: ["**打开成功**", `标题："${title}"；`, `TabID: "${tab.id}"；`],
    contentLabel: "内容：",
    content,
    internalUrl: pageUrl || url,
  });
};
const executeClickButton = async (args) => {
  const { id } = validateClickButtonArgs(args);
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
      await waitForContentScript(tab.id, 3000);
      const result = await sendMessageToTab(tab.id, {
        type: "clickButton",
        id,
      });
      if (result?.ok) {
        return { ...state, done: true, result: "成功" };
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
    return finalState.result;
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
const executeGetPageMarkdown = async (args) => {
  const { tabId } = validateGetPageMarkdownArgs(args);
  const tabs = await getAllTabs();
  const targetTab = tabs.find((tab) => tab.id === tabId);
  if (!targetTab) {
    throw new Error(`未找到 TabID 为 ${tabId} 的标签页`);
  }
  if (typeof targetTab.url !== "string" || !targetTab.url.trim()) {
    throw new Error("标签页缺少 URL");
  }
  if (isInternalUrl(targetTab.url)) {
    const title = targetTab.title || "";
    return `**标题：**\n${title}\n**URL：**\n${targetTab.url}\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  const { title, url, content } = await fetchPageMarkdownData(tabId);
  return formatPageReadResult({
    headerLines: ["**标题：**", title, "**URL：**", url],
    contentLabel: "**内容：**",
    content,
    internalUrl: url,
  });
};
const executeCloseBrowserPage = async (args) => {
  const { tabId } = validateClosePageArgs(args);
  await closeTab(tabId);
  return "成功";
};
const executeRunConsoleCommand = async (args) => {
  const { command } = validateConsoleArgs(args);
  const result = await sendMessageToSandbox({ command });
  if (!result?.ok) {
    throw new Error(result?.error || "命令执行失败");
  }
  return result.output;
};
const executeListTabs = async (args) => {
  validateListTabsArgs(args);
  const tabs = await getAllTabs();
  return tabs
    .map((tab) => {
      const title = tab.title || "无标题";
      const url = tab.url || "无地址";
      const { id } = tab;
      return `标题: "${title}"\nURL: "${url}"\nTabID: "${id}"`;
    })
    .join("\n\n");
};
export const buildPageMarkdownToolOutput = async (tabId) =>
  executeGetPageMarkdown({ tabId });
const toolStrategies = new Map([
  [toolNames.openBrowserPage, executeOpenBrowserPage],
  [toolNames.clickButton, executeClickButton],
  [toolNames.getPageMarkdown, executeGetPageMarkdown],
  [toolNames.closeBrowserPage, executeCloseBrowserPage],
  [toolNames.runConsoleCommand, executeRunConsoleCommand],
  [toolNames.listTabs, executeListTabs],
]);
const getToolStrategy = (name) => {
  const strategy = toolStrategies.get(name);
  if (!strategy) {
    throw new Error(`未支持的工具：${name}`);
  }
  return strategy;
};
const executeToolCall = async (toolCall) => {
  const normalized = normalizeToolCall(toolCall);
  if (!normalized) {
    throw new Error("工具调用格式不正确");
  }
  const args = parseToolArguments(normalized.arguments || "{}");
  const strategy = getToolStrategy(normalized.name);
  return strategy(args);
};
export const handleToolCalls = async (toolCalls) => {
  await toolCalls.reduce(async (promise, call) => {
    await promise;
    const callId = getToolCallId(call);
    const name = getToolCallName(call);
    let output = "成功";
    try {
      output = await executeToolCall(call);
    } catch (error) {
      const message = error?.message || "工具调用失败";
      setText(statusEl, message);
      output =
        name === toolNames.closeBrowserPage ? "失败" : `失败: ${message}`;
    }
    addMessage({ role: "tool", content: output, tool_call_id: callId, name });
  }, Promise.resolve());
};
