import { parseJson } from "../utils/json.js";
export const toolNames = {
  openBrowserPage: "open_page",
  clickButton: "clickButton",
  getPageMarkdown: "get_page",
  closeBrowserPage: "close_page",
  runConsoleCommand: "run_console",
};
const TOOL_STRICT = true;
const openPageToolSchema = {
  type: "object",
  properties: {
    url: { type: "string" },
    focus: { type: "boolean", description: "是否切换浏览器焦点到新页面" },
  },
  required: ["url", "focus"],
  additionalProperties: false,
};
const clickButtonToolSchema = {
  type: "object",
  properties: { id: { type: "string", description: "要点击的 button 的 ID" } },
  required: ["id"],
  additionalProperties: false,
};
const pageMarkdownToolSchema = {
  type: "object",
  properties: { tabId: { type: "number" } },
  required: ["tabId"],
  additionalProperties: false,
};
const closePageToolSchema = {
  type: "object",
  properties: { tabId: { type: "number" } },
  required: ["tabId"],
  additionalProperties: false,
};
const consoleToolSchema = {
  type: "object",
  properties: { command: { type: "string" } },
  required: ["command"],
  additionalProperties: false,
};
const toolDescriptors = [
  {
    name: toolNames.openBrowserPage,
    description: "在当前浏览器打开指定网页",
    parameters: openPageToolSchema,
  },
  {
    name: toolNames.clickButton,
    description: "点击当前页面上指定的 button",
    parameters: clickButtonToolSchema,
  },
  {
    name: toolNames.getPageMarkdown,
    description: "读取页面内容",
    parameters: pageMarkdownToolSchema,
  },
  {
    name: toolNames.closeBrowserPage,
    description: "关闭标签页",
    parameters: closePageToolSchema,
  },
  {
    name: toolNames.runConsoleCommand,
    description: "在 Sandbox Page 中执行控制台命令并获取结果",
    parameters: consoleToolSchema,
  },
];

const buildToolDefinition = (tool, useResponsesFormat) => {
  const description = tool.description;
  if (!description) {
    throw new Error(`工具 ${tool.name} 缺少 description`);
  }
  if (useResponsesFormat) {
    return {
      type: "function",
      name: tool.name,
      description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    };
  }
  return {
    type: "function",
    function: {
      name: tool.name,
      description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    },
  };
};
export const getToolDefinitions = (apiType) => {
  const useResponsesFormat = apiType === "responses";
  return toolDescriptors.map((tool) =>
    buildToolDefinition(tool, useResponsesFormat),
  );
};
export const parseToolArguments = (text) => parseJson(text);
export const getToolCallArguments = (call) =>
  call?.function?.arguments ?? call?.arguments ?? "";
export const getToolCallId = (call) => {
  const callId = call?.call_id || call?.id;
  if (!callId) throw new Error("工具调用缺少 call_id");
  return callId;
};
export const getToolCallName = (call) => {
  const name = call?.function?.name || call?.name;
  if (!name) throw new Error("工具调用缺少 name");
  return name;
};
const validateTabIdArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  const raw = args.tabId;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return { tabId: raw };
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("tabId 必须是正整数");
    }
    return { tabId: parsed };
  }
  throw new Error("tabId 必须是正整数");
};
export const validateGetPageMarkdownArgs = (args) => validateTabIdArgs(args);
export const validateClosePageArgs = (args) => {
  return validateTabIdArgs(args);
};
export const validateConsoleArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.command !== "string" || !args.command.trim()) {
    throw new Error("command 必须是非空字符串");
  }
  return { command: args.command.trim() };
};
export const validateOpenPageArgs = (args) => {
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
export const validateClickButtonArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new Error("工具参数必须是对象");
  }
  if (typeof args.id !== "string" || !args.id.trim()) {
    throw new Error("id 必须是非空字符串");
  }
  return { id: args.id.trim() };
};
