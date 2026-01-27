import { statusEl } from "../ui/elements";
import { setText } from "../ui/text";
import { addMessage } from "../state/store";
import { convertPageContentToMarkdown } from "../markdown/converter";
import { isInternalUrl } from "../utils/url";
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
} from "./definitions";
import {
  createTab,
  closeTab,
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../services/tabs";
import { sendMessageToSandbox } from "../services/sandbox";

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
    return {
      id,
      call_id: toolCall.call_id || id,
      name,
      arguments: args,
    };
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
const executeOpenBrowserPage = async (args) => {
  const { url, focus } = validateOpenPageArgs(args);
  const tabs = await getAllTabs();
  let matchedTab = null;
  for (const tab of tabs) {
    if (typeof tab.url !== "string" || !tab.url.trim()) {
      throw new Error("标签页缺少 URL");
    }
    const tabUrl = new URL(tab.url).toString();
    if (tabUrl === url) {
      matchedTab = tab;
      break;
    }
  }
  if (matchedTab) {
    if (typeof matchedTab.id !== "number") {
      throw new Error("标签页缺少 TabID");
    }
    return `失败，浏览器中已存在相同页面，TabID："${matchedTab.id}"`;
  }
  const tab = await createTab(url, focus);
  if (isInternalUrl(url)) {
    const title = tab.title || "";
    return `**打开成功**\nTabID: "${tab.id}"；\n标题："${title}"；\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  await waitForContentScript(tab.id);
  const pageData = await sendMessageToTab(tab.id, { type: "getPageContent" });
  const {
    title,
    url: pageUrl,
    content,
  } = convertPageContentToMarkdown(pageData);
  if (isInternalUrl(pageUrl || url)) {
    return `**打开成功**\nTabID: "${tab.id}"；\n标题："${title}"；\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  return `**打开成功**\nTabID: "${tab.id}"；\n标题："${title}"；\n内容：\n${content}`;
};
const executeClickButton = async (args) => {
  const { id } = validateClickButtonArgs(args);
  const tabs = await getAllTabs();
  if (!tabs.length) {
    throw new Error("未找到可用标签页");
  }
  const errors = [];
  let notFoundCount = 0;
  for (const tab of tabs) {
    if (typeof tab.id !== "number") {
      errors.push("标签页缺少 TabID");
      continue;
    }
    try {
      await waitForContentScript(tab.id, 3000);
      const result = await sendMessageToTab(tab.id, {
        type: "ClickButton",
        id,
      });
      if (result?.ok) {
        return "成功";
      }
      if (result?.ok === false && result.reason === "not_found") {
        notFoundCount += 1;
        continue;
      }
      throw new Error("按钮点击返回结果异常");
    } catch (error) {
      const message = error?.message || "点击失败";
      errors.push(`TabID ${tab.id}: ${message}`);
    }
  }
  if (errors.length) {
    if (notFoundCount) {
      throw new Error(
        `未在任何标签页找到 id 为 ${id} 的按钮，且部分标签页发生错误：${errors.join("；")}`,
      );
    }
    throw new Error(`所有标签页点击失败：${errors.join("；")}`);
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
  await waitForContentScript(tabId);
  const pageData = await sendMessageToTab(tabId, { type: "getPageContent" });
  const { title, url, content } = convertPageContentToMarkdown(pageData);
  if (isInternalUrl(url)) {
    return `**标题：**\n${title}\n**URL：**\n${url}\n**读取失败：**\n该页面为浏览器内部页面，无法读取。`;
  }
  return `**标题：**\n${title}\n**URL：**\n${url}\n**内容：**\n${content}`;
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
const executeToolCall = async (toolCall) => {
  const normalized = normalizeToolCall(toolCall);
  if (!normalized) {
    throw new Error("工具调用格式不正确");
  }
  const args = parseToolArguments(normalized.arguments || "{}");
  if (normalized.name === toolNames.openBrowserPage) {
    return executeOpenBrowserPage(args);
  }
  if (normalized.name === toolNames.clickButton) {
    return executeClickButton(args);
  }
  if (normalized.name === toolNames.getPageMarkdown) {
    return executeGetPageMarkdown(args);
  }
  if (normalized.name === toolNames.closeBrowserPage) {
    return executeCloseBrowserPage(args);
  }
  if (normalized.name === toolNames.runConsoleCommand) {
    return executeRunConsoleCommand(args);
  }
  if (normalized.name === toolNames.listTabs) {
    return executeListTabs(args);
  }
  throw new Error(`未支持的工具：${normalized.name}`);
};
export const handleToolCalls = async (toolCalls) => {
  for (const call of toolCalls) {
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
    addMessage({
      role: "tool",
      content: output,
      tool_call_id: callId,
      name,
    });
  }
};
