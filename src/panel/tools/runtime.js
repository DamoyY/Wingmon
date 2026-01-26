import {
  setText,
  statusEl,
  state,
  convertPageContentToMarkdown,
} from "../ui.js";
import {
  toolNames,
  parseJson,
  getToolCallId,
  getToolCallName,
  validateGetPageMarkdownArgs,
  validateClosePageArgs,
  validateConsoleArgs,
} from "./definitions.js";

const parseToolArguments = (text) => parseJson(text);
const getToolCallArguments = (call) =>
  call.function?.arguments ?? call.arguments ?? "";
const SANDBOX_FRAME_ID = "llm-sandbox-frame";
const SANDBOX_RESPONSE_TYPE = "runConsoleResult";
const SANDBOX_REQUEST_TYPE = "runConsoleCommand";
const SANDBOX_LOAD_TIMEOUT = 5000;
let sandboxReadyPromise = null;
let sandboxWindow = null;
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
const createTab = (url, active) =>
  new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法创建标签页";
        reject(new Error(message));
        return;
      }
      if (!tab) {
        reject(new Error("创建标签页失败"));
        return;
      }
      if (typeof tab.id !== "number") {
        reject(new Error("创建标签页失败：缺少 tab.id"));
        return;
      }
      resolve(tab);
    });
  });
const closeTab = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "无法关闭标签页";
        reject(new Error(message));
        return;
      }
      resolve();
    });
  });
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const validateOpenPageArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.url !== "string" || !args.url.trim()) {
    throw new Error("url 必须是非空字符串");
  }
  if (typeof args.focus !== "boolean") {
    throw new Error("focus 必须是布尔值");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch (error) {
    throw new Error("url 格式不正确");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("url 仅支持 http 或 https");
  }
  return { url: parsedUrl.toString(), focus: args.focus };
};
const validateClickButtonArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.id !== "string" || !args.id.trim()) {
    throw new Error("id 必须是非空字符串");
  }
  return { id: args.id.trim() };
};
const executeOpenBrowserPage = async (args) => {
  const { url, focus } = validateOpenPageArgs(args);
  const tab = await createTab(url, focus);
  await waitForContentScript(tab.id);
  const pageData = await sendMessageToTab(tab.id, { type: "getPageContent" });
  const { title, content } = convertPageContentToMarkdown(pageData);
  return `**成功**\ntabId: "${tab.id}"；\n标题：“${title}”；\n内容：\n${content}`;
};
const getActiveTabId = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法查询活动标签页";
        reject(new Error(message));
        return;
      }
      const tabId = tabs?.[0]?.id;
      if (!tabId) {
        reject(new Error("未找到活动标签页"));
        return;
      }
      resolve(tabId);
    });
  });
const sendMessageToTab = (tabId, payload) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "无法发送消息到页面";
        reject(new Error(message));
        return;
      }
      if (!response) {
        reject(new Error("页面未返回结果"));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
const ensureSandboxFrame = () => {
  if (!document?.body) {
    throw new Error("面板尚未就绪，无法创建 sandbox");
  }
  const existing = document.getElementById(SANDBOX_FRAME_ID);
  if (existing) return existing;
  const frame = document.createElement("iframe");
  frame.id = SANDBOX_FRAME_ID;
  frame.src = chrome.runtime.getURL("public/sandbox.html");
  frame.style.display = "none";
  document.body.appendChild(frame);
  return frame;
};
const getSandboxWindow = async () => {
  if (sandboxWindow) return sandboxWindow;
  if (!sandboxReadyPromise) {
    sandboxReadyPromise = new Promise((resolve, reject) => {
      const frame = ensureSandboxFrame();
      const timer = setTimeout(() => {
        sandboxReadyPromise = null;
        reject(new Error(`sandbox 页面加载超时（${SANDBOX_LOAD_TIMEOUT}ms）`));
      }, SANDBOX_LOAD_TIMEOUT);
      const handleLoad = () => {
        clearTimeout(timer);
        sandboxReadyPromise = null;
        sandboxWindow = frame.contentWindow;
        if (!sandboxWindow) {
          reject(new Error("无法获取 sandbox 窗口"));
          return;
        }
        resolve(sandboxWindow);
      };
      frame.addEventListener("load", handleLoad, { once: true });
    });
  }
  return sandboxReadyPromise;
};
const createSandboxRequestId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `sandbox_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
const sendMessageToSandbox = async (payload, timeoutMs = 5000) => {
  const targetWindow = await getSandboxWindow();
  if (!targetWindow) {
    throw new Error("sandbox 窗口不可用");
  }
  const requestId = createSandboxRequestId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error(`等待 sandbox 响应超时（${timeoutMs}ms）`));
    }, timeoutMs);
    const handleMessage = (event) => {
      if (event.source !== targetWindow) return;
      const data = event.data;
      if (!data || data.type !== SANDBOX_RESPONSE_TYPE) return;
      if (data.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      resolve(data);
    };
    window.addEventListener("message", handleMessage);
    targetWindow.postMessage(
      { ...payload, requestId, type: SANDBOX_REQUEST_TYPE },
      "*",
    );
  });
};
const waitForContentScript = async (tabId, timeoutMs = 5000) => {
  if (typeof tabId !== "number") {
    throw new Error("tabId 必须是数字");
  }
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await sendMessageToTab(tabId, { type: "ping" });
      if (response?.ok) return;
      throw new Error("页面未返回就绪信号");
    } catch (error) {
      lastError = error;
      await delay(1000);
    }
  }
  const tail = lastError?.message ? `，最后错误：${lastError.message}` : "";
  throw new Error(`等待页面内容脚本就绪超时（${timeoutMs}ms${tail}）`);
};
const executeClickButton = async (args) => {
  const { id } = validateClickButtonArgs(args);
  const tabId = await getActiveTabId();
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
  const { command, tabId } = validateConsoleArgs(args);
  let result;
  if (typeof tabId === "number") {
    await waitForContentScript(tabId);
    result = await sendMessageToTab(tabId, {
      type: "runConsoleCommand",
      command,
    });
  } else {
    result = await sendMessageToSandbox({ command });
  }
  if (!result?.ok) {
    throw new Error(result?.error || "命令执行失败");
  }
  return result.output;
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
    state.messages.push({
      role: "tool",
      content: output,
      tool_call_id: callId,
      name,
      hidden: true,
    });
  }
};
