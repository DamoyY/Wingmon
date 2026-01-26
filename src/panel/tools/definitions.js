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
    url: { type: "string", description: "要打开的 URL" },
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
  properties: { tabId: { type: "number", description: "标签页 ID" } },
  required: ["tabId"],
  additionalProperties: false,
};
const closePageToolSchema = {
  type: "object",
  properties: { tabId: { type: "number", description: "标签页 ID" } },
  required: ["tabId"],
  additionalProperties: false,
};
const consoleToolSchema = {
  type: "object",
  properties: {
    command: { type: "string", description: "要执行的命令" },
    tabId: { type: "number", description: "可选，标签页 ID" },
  },
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
    description: "输入 tabId 读取页面内容",
    parameters: pageMarkdownToolSchema,
  },
  {
    name: toolNames.closeBrowserPage,
    description: "输入 tabId 关闭标签页",
    parameters: closePageToolSchema,
  },
  {
    name: toolNames.runConsoleCommand,
    description: "在指定标签页或 Service Worker 中执行命令并返回结果",
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
export const parseJson = (text) => {
  if (typeof text !== "string") {
    throw new Error("JSON 输入必须是字符串");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 解析失败：${error.message}`);
  }
};
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
export const validateGetPageMarkdownArgs = (args) =>
  validateTabIdArgs(args);
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
  let tabId;
  if (Object.prototype.hasOwnProperty.call(args, "tabId")) {
    const raw = args.tabId;
    if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
      tabId = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("tabId 必须是正整数");
      }
      tabId = parsed;
    } else {
      throw new Error("tabId 必须是正整数");
    }
  }
  return { command: args.command.trim(), tabId };
};
