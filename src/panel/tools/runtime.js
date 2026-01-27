import { statusEl } from "../ui/elements.js";
import { setText } from "../ui/text.js";
import { addMessage } from "../state/store.js";
import { convertPageContentToMarkdown } from "../markdown/converter.js";
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
  createTab,
  closeTab,
  getActiveTab,
  getAllTabs,
  sendMessageToTab,
  waitForContentScript,
} from "../services/tabs.js";
import { sendMessageToSandbox } from "../services/sandbox.js";
const normalizeToolCall = (toolCall) => {
  if (!toolCall) return null;
  if (toolCall.function) {
    const id = toolCall.id;
    const name = toolCall.function?.name;
    const args = getToolCallArguments(toolCall);
    if (!id || !name) return null;
    return { id, call_id: toolCall.call_id || id, name, arguments: args };
  }
  if (toolCall.name) {
    const callId = toolCall.call_id || toolCall.id;
    if (!callId) return null;
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
  await waitForContentScript(tab.id);
  const pageData = await sendMessageToTab(tab.id, { type: "getPageContent" });
  const { title, content } = convertPageContentToMarkdown(pageData);
  return `**成功**\nTabID: "${tab.id}"；\n标题："${title}"；\n内容：\n${content}`;
};
const executeClickButton = async (args) => {
  const { id } = validateClickButtonArgs(args);
  const activeTab = await getActiveTab();
  if (typeof activeTab.id !== "number") {
    throw new Error("活动标签页缺少 TabID");
  }
  const tabId = activeTab.id;
  const result = await sendMessageToTab(tabId, { type: "clickButton", id });
  if (!result?.ok) {
    throw new Error("点击按钮失败");
  }
  return "成功";
};
const executeGetPageMarkdown = async (args) => {
  const { tabId } = validateGetPageMarkdownArgs(args);
  await waitForContentScript(tabId);
  const pageData = await sendMessageToTab(tabId, { type: "getPageContent" });
  const { title, url, content } = convertPageContentToMarkdown(pageData);
  return `**标题：**\n${title}\n**地址：**\n${url}\n**内容：**\n${content}`;
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
      const id = tab.id;
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
    addMessage({ role: "tool", content: output, tool_call_id: callId, name });
  }
};
