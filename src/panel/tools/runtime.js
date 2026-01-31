import { isInternalUrl } from "../utils/index.js";
import {
  toolNames,
  parseToolArguments,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  ToolInputError,
  validateOpenPageArgs,
  validateClickButtonArgs,
  validateGetPageMarkdownArgs,
  validateClosePageArgs,
  validateConsoleArgs,
  validateListTabsArgs,
} from "./definitions.js";
import {
  buildOpenPageAlreadyExistsOutput,
  buildOpenPageReadOutput,
  buildClickButtonOutput,
  buildPageMarkdownOutput,
  buildListTabsOutput,
  buildToolErrorOutput,
  defaultToolSuccessOutput,
  buildClosePageOutput,
} from "./toolOutput.js";
import {
  closeTab,
  createTab,
  getAllTabs,
  getSettings,
  focusTab,
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
  if (!pageData || typeof pageData.content !== "string") {
    throw new Error("页面内容为空");
  }
  return {
    title: pageData.title || "",
    url: pageData.url || "",
    content: pageData.content,
  };
};
const shouldFollowMode = async () => {
  const settings = await getSettings();
  return Boolean(settings.followMode);
};
const executeOpenBrowserPage = async (args) => {
  const { url, focus } = validateOpenPageArgs(args);
  const followMode = await shouldFollowMode();
  const shouldFocus = followMode || focus;
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
    if (shouldFocus) {
      await focusTab(matchedTab.id);
    }
    return buildOpenPageAlreadyExistsOutput(matchedTab.id);
  }
  const tab = await createTab(url, shouldFocus);
  if (shouldFocus) {
    await focusTab(tab.id);
  }
  const initialInternal = isInternalUrl(url);
  if (initialInternal) {
    const title = tab.title || "";
    return buildOpenPageReadOutput({
      title,
      tabId: tab.id,
      isInternal: true,
    });
  }
  const { title, url: pageUrl, content } = await fetchPageMarkdownData(tab.id);
  return buildOpenPageReadOutput({
    title,
    tabId: tab.id,
    content,
    isInternal: isInternalUrl(pageUrl || url),
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
  if (await shouldFollowMode()) {
    await focusTab(tabId);
  }
  const internalUrl = isInternalUrl(targetTab.url);
  if (internalUrl) {
    const title = targetTab.title || "";
    return buildPageMarkdownOutput({
      title,
      url: targetTab.url,
      isInternal: true,
    });
  }
  const { title, url, content } = await fetchPageMarkdownData(tabId);
  return buildPageMarkdownOutput({
    title,
    url,
    content,
    isInternal: false,
  });
};
const executeCloseBrowserPage = async (args) => {
  const { tabId } = validateClosePageArgs(args);
  await closeTab(tabId);
  return buildClosePageOutput();
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
  return buildListTabsOutput(tabs);
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
    throw new ToolInputError(`未支持的工具：${name}`);
  }
  return strategy;
};
const executeToolCall = async (toolCall) => {
  const normalized = normalizeToolCall(toolCall);
  if (!normalized) {
    throw new ToolInputError("工具调用格式不正确");
  }
  const args = parseToolArguments(normalized.arguments || "{}");
  const strategy = getToolStrategy(normalized.name);
  return strategy(args);
};
const resolveToolOutput = (output, name) => {
  if (typeof output === "string") {
    return { content: output };
  }
  if (!output || typeof output !== "object") {
    throw new Error(`工具输出无效：${name}`);
  }
  if (typeof output.content !== "string") {
    throw new Error(`工具输出内容无效：${name}`);
  }
  const result = { content: output.content };
  if (output.pageReadTabId !== undefined) {
    if (!Number.isInteger(output.pageReadTabId) || output.pageReadTabId <= 0) {
      throw new Error(`工具输出 TabID 无效：${name}`);
    }
    result.pageReadTabId = output.pageReadTabId;
  }
  return result;
};
const buildToolMessage = ({ callId, name, content, pageReadTabId }) => ({
  role: "tool",
  content,
  tool_call_id: callId,
  name,
  pageReadTabId,
});
const executeToolCallToMessage = async (call) => {
  let callId;
  let name;
  let output = defaultToolSuccessOutput;
  let pageReadTabId;
  try {
    callId = getToolCallId(call);
    name = getToolCallName(call);
    const resolved = resolveToolOutput(await executeToolCall(call), name);
    output = resolved.content;
    pageReadTabId = resolved.pageReadTabId;
  } catch (error) {
    const isInputError = error instanceof ToolInputError;
    console.error(
      `工具执行失败: ${name || "未知工具"}`,
      error?.message || "未知错误",
    );
    output = buildToolErrorOutput({
      message: error?.message,
      isInputError,
      isCloseTool: name === toolNames.closeBrowserPage,
    });
  }
  if (!callId || !name) {
    throw new ToolInputError("工具调用缺少 call_id 或 name");
  }
  return buildToolMessage({
    callId,
    name,
    content: output,
    pageReadTabId,
  });
};
export const handleToolCalls = async (toolCalls) => {
  const messages = [];
  await toolCalls.reduce(async (promise, call) => {
    await promise;
    const message = await executeToolCallToMessage(call);
    messages.push(message);
  }, Promise.resolve());
  return messages;
};
