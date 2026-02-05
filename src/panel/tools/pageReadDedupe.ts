import { t } from "../utils/index.ts";
import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolValidator,
  parseToolArguments,
  toolNames,
} from "./definitions.js";

type ToolCallFunction = {
  name?: string;
  arguments?: string;
};

type ToolCall = {
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: unknown;
  function?: ToolCallFunction;
};

type Message = {
  role?: string;
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  pageReadTabId?: number;
};

type PageReadCallInfo = {
  name: string;
  tabId?: number;
  pageNumber?: number;
  url?: string;
  isPdf?: boolean;
};

type PageReadEvent = {
  tabId: number;
  type: string;
  callId: string;
  index: number;
  pageNumber?: number;
  isPdf?: boolean;
};

type ToolNames = {
  getPageMarkdown: string;
  openBrowserPage: string;
  clickButton: string;
};

const tSafe = t as (key: string) => string,
  toolNamesSafe = toolNames as ToolNames,
  getToolCallArgumentsSafe = getToolCallArguments as (call: ToolCall) => string,
  getToolCallIdSafe = getToolCallId as (call: ToolCall) => string,
  getToolCallNameSafe = getToolCallName as (call: ToolCall) => string,
  getToolValidatorSafe = getToolValidator as (
    name: string,
  ) => (args: unknown) => unknown,
  parseToolArgumentsSafe = parseToolArguments as (text: string) => unknown;

const resolvePageNumberKey = (pageNumber?: number): number => {
    if (Number.isInteger(pageNumber) && pageNumber > 0) {
      return pageNumber;
    }
    return 1;
  },
  urlLabelPattern = /^\*\*URL[:：]\*\*$/i,
  isPdfUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.pathname.toLowerCase().endsWith(".pdf");
    } catch (error) {
      console.error("PDF 地址解析失败", error);
      return false;
    }
  },
  extractUrlFromGetPageOutput = (content: string): string | null => {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i += 1) {
      const line = lines[i].trim();
      if (line === tSafe("statusUrlLabel") || urlLabelPattern.test(line)) {
        const urlLine = lines[i + 1]?.trim();
        if (!urlLine) {
          console.error("get_page 工具响应缺少 URL");
          return null;
        }
        return urlLine;
      }
    }
    console.error("get_page 工具响应缺少 URL 标签");
    return null;
  },
  buildPageReadKey = (event: PageReadEvent): string => {
    const pageNumber = event.isPdf ? resolvePageNumberKey(event.pageNumber) : 1;
    return `${String(event.tabId)}:${String(pageNumber)}`;
  },
  extractGetPageInfoFromCall = (call: ToolCall) => {
    const argsText = getToolCallArgumentsSafe(call);
    let args: unknown;
    try {
      args = parseToolArgumentsSafe(argsText || "{}");
    } catch (error) {
      const message = (error as Error | undefined)?.message || "未知错误";
      throw new Error(`get_page 工具参数解析失败：${message}`);
    }
    const { tabId, pageNumber } = getToolValidatorSafe(
      toolNamesSafe.getPageMarkdown,
    )(args) as {
      tabId: number;
      pageNumber?: number;
    };
    return { tabId, pageNumber };
  },
  extractOpenPageInfoFromCall = (call: ToolCall) => {
    const argsText = getToolCallArgumentsSafe(call);
    let args: unknown;
    try {
      args = parseToolArgumentsSafe(argsText || "{}");
    } catch (error) {
      const message = (error as Error | undefined)?.message || "未知错误";
      throw new Error(`open_page 工具参数解析失败：${message}`);
    }
    const { pageNumber, url } = getToolValidatorSafe(
      toolNamesSafe.openBrowserPage,
    )(args) as {
      pageNumber?: number;
      url: string;
    };
    return { pageNumber, url, isPdf: isPdfUrl(url) };
  },
  extractPageReadTabIdFromOutput = (
    content: unknown,
    successLabel: string,
    toolName: string,
  ) => {
    if (typeof content !== "string") {
      throw new Error(`${toolName} 工具响应必须是字符串`);
    }
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error(`${toolName} 工具响应不能为空`);
    }
    if (!trimmed.startsWith(successLabel)) {
      return null;
    }
    if (trimmed === successLabel) {
      return null;
    }
    const match = trimmed.match(/TabID:\s*["'“”]?(\d+)["'“”]?/);
    if (!match) {
      throw new Error(`${toolName} 成功响应缺少 TabID`);
    }
    const tabId = Number(match[1]);
    if (!Number.isInteger(tabId) || tabId <= 0) {
      throw new Error(`${toolName} 响应 TabID 无效`);
    }
    return tabId;
  },
  extractOpenPageTabIdFromOutput = (content: unknown) =>
    extractPageReadTabIdFromOutput(
      content,
      tSafe("statusOpenSuccess"),
      toolNamesSafe.openBrowserPage,
    ),
  extractClickButtonTabIdFromMessage = (message: Message) => {
    const storedTabId = message.pageReadTabId;
    if (Number.isInteger(storedTabId) && storedTabId > 0) {
      return storedTabId;
    }
    const tabId = extractPageReadTabIdFromOutput(
      message.content,
      tSafe("statusClickSuccess"),
      toolNamesSafe.clickButton,
    );
    if (!tabId) {
      return null;
    }
    return tabId;
  },
  isGetPageSuccessOutput = (content: unknown): content is string =>
    typeof content === "string" &&
    content.trim().startsWith(tSafe("statusTitleLabel"));

export const collectPageReadDedupeSets = (messages: Message[]) => {
  const callInfoById = new Map<string, PageReadCallInfo>();
  messages.forEach((msg) => {
    if (!Array.isArray(msg.tool_calls)) {
      return;
    }
    msg.tool_calls.forEach((call) => {
      const callId = getToolCallIdSafe(call),
        name = getToolCallNameSafe(call);
      if (callInfoById.has(callId)) {
        const existing = callInfoById.get(callId);
        if (existing?.name !== name) {
          throw new Error(`重复的工具调用 ID：${callId}`);
        }
        return;
      }
      const info: PageReadCallInfo = { name };
      if (name === toolNamesSafe.getPageMarkdown) {
        const { tabId, pageNumber } = extractGetPageInfoFromCall(call);
        info.tabId = tabId;
        info.pageNumber = pageNumber;
      }
      if (name === toolNamesSafe.openBrowserPage) {
        const { pageNumber, url, isPdf } = extractOpenPageInfoFromCall(call);
        info.pageNumber = pageNumber;
        info.url = url;
        info.isPdf = isPdf;
      }
      callInfoById.set(callId, info);
    });
  });
  const readEvents: PageReadEvent[] = [];
  messages.forEach((msg, index) => {
    if (msg.role !== "tool") {
      return;
    }
    const callId = msg.tool_call_id;
    if (!callId) {
      throw new Error("工具响应缺少 tool_call_id");
    }
    const info = callInfoById.get(callId),
      name = msg.name || info?.name;
    if (!name) {
      throw new Error(`工具响应缺少 name：${callId}`);
    }
    if (name === toolNamesSafe.getPageMarkdown) {
      const content = msg.content;
      if (!isGetPageSuccessOutput(content)) {
        return;
      }
      if (!info) {
        throw new Error(`get_page 工具响应缺少参数：${callId}`);
      }
      const tabId = info.tabId;
      if (!tabId) {
        throw new Error(`get_page 工具响应缺少 tabId：${callId}`);
      }
      const url = extractUrlFromGetPageOutput(content);
      const isPdf = url ? isPdfUrl(url) : false;
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
        pageNumber: info.pageNumber,
        isPdf,
      });
      return;
    }
    if (name === toolNamesSafe.openBrowserPage) {
      const tabId = extractOpenPageTabIdFromOutput(msg.content);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
        pageNumber: info ? info.pageNumber : undefined,
        isPdf: info?.isPdf,
      });
      return;
    }
    if (name === toolNamesSafe.clickButton) {
      const tabId = extractClickButtonTabIdFromMessage(msg);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
        isPdf: false,
      });
    }
  });
  const latestByKey = new Map<string, PageReadEvent>();
  readEvents.forEach((event) => {
    const key = buildPageReadKey(event);
    const existing = latestByKey.get(key);
    if (!existing || event.index > existing.index) {
      latestByKey.set(key, event);
    }
  });
  const removeToolCallIds = new Set<string>(),
    trimToolResponseIds = new Set<string>();
  readEvents.forEach((event) => {
    const latest = latestByKey.get(buildPageReadKey(event));
    if (!latest || latest.callId === event.callId) {
      return;
    }
    if (event.type === toolNamesSafe.getPageMarkdown) {
      removeToolCallIds.add(event.callId);
      return;
    }
    if (
      event.type === toolNamesSafe.openBrowserPage ||
      event.type === toolNamesSafe.clickButton
    ) {
      trimToolResponseIds.add(event.callId);
    }
  });
  return { removeToolCallIds, trimToolResponseIds };
};

export const getToolOutputContent = (
  msg: Message,
  trimToolResponseIds: Set<string>,
) =>
  trimToolResponseIds.has(msg.tool_call_id || "")
    ? `**${tSafe("statusSuccess")}**`
    : (() => {
        if (typeof msg.content !== "string") {
          throw new Error("工具响应内容无效");
        }
        return msg.content;
      })();
