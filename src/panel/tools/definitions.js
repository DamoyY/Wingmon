export const toolNames = {
  openBrowserPage: "open_page",
  clickElement: "clickElement",
  getPageMarkdown: "get_page",
};
const openPageToolSchema = {
  type: "object",
  properties: {
    url: { type: "string", description: "要打开的 URL" },
    focus: { type: "boolean", description: "是否切换浏览器焦点到新页面" },
  },
  required: ["url", "focus"],
  additionalProperties: false,
};
const clickElementToolSchema = {
  type: "object",
  properties: { id: { type: "string", description: "要点击的 botton 的 ID" } },
  required: ["id"],
  additionalProperties: false,
};
const pageMarkdownToolSchema = {
  type: "object",
  properties: { tabId: { type: "number", description: "标签页 ID" } },
  required: ["tabId"],
  additionalProperties: false,
};
export const getToolDefinitions = (apiType) => {
  if (apiType === "responses") {
    return [
      {
        type: "function",
        name: toolNames.openBrowserPage,
        description: "在当前浏览器打开指定网页",
        parameters: openPageToolSchema,
        strict: true,
      },
      {
        type: "function",
        name: toolNames.clickElement,
        description: "点击当前页面上指定的 botton",
        parameters: clickElementToolSchema,
        strict: true,
      },
      {
        type: "function",
        name: toolNames.getPageMarkdown,
        description: "输入 tabId 读取页面内容",
        parameters: pageMarkdownToolSchema,
        strict: true,
      },
    ];
  }
  return [
    {
      type: "function",
      function: {
        name: toolNames.openBrowserPage,
        description: "在当前浏览器打开指定网页。",
        parameters: openPageToolSchema,
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: toolNames.clickElement,
        description: "点击当前页面上指定 ID 的按钮。",
        parameters: clickElementToolSchema,
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: toolNames.getPageMarkdown,
        description: "输入 tabId 读取页面内容",
        parameters: pageMarkdownToolSchema,
        strict: true,
      },
    },
  ];
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
export const validateGetPageMarkdownArgs = (args) => {
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
