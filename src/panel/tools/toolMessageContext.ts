import { t } from "../utils/index.ts";
import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolValidator,
  parseToolArguments,
  toolNames,
  type JsonValue,
  type ToolCall,
} from "./definitions.ts";

type Message = {
  role?: string;
  content?: unknown;
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
};

type PageReadEvent = {
  tabId: number;
  type: string;
  callId: string;
  index: number;
  pageNumber?: number;
  url?: string;
};

type GetPageArgs = {
  tabId: number;
  pageNumber?: number;
};

type OpenPageArgs = {
  pageNumber?: number;
  url: string;
};

export type ViewportChunkPlan = {
  viewportCenter: number;
  totalChunks: number;
  currentChunk: number;
  nearbyChunk: number | null;
};

const resolvePageNumberKey = (pageNumber?: number): number => {
    if (Number.isInteger(pageNumber) && pageNumber > 0) {
      return pageNumber;
    }
    return 1;
  },
  clampChunk = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value)),
  parseViewportCenterValues = (
    content: string,
  ): { viewportCenter: number; totalChunks: number } | null => {
    const patterns = [
      /"viewportCenter"\s*:\s*"?(?<center>\d+(?:\.\d+)?)\s*\/\s*(?<total>\d+)"?/i,
      /viewportCenter\s*[:：=]\s*(?<center>\d+(?:\.\d+)?)\s*\/\s*(?<total>\d+)/i,
      /\*\*viewportCenter[:：]?\*\*\s*(?<center>\d+(?:\.\d+)?)\s*\/\s*(?<total>\d+)/i,
    ];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (!match?.groups) {
        continue;
      }
      const { center, total } = match.groups;
      const viewportCenter = Number(center),
        totalChunks = Number(total);
      if (!Number.isFinite(viewportCenter)) {
        console.error("viewportCenter 数值无效", { center });
        return null;
      }
      if (!Number.isInteger(totalChunks) || totalChunks <= 0) {
        console.error("viewportCenter 总分片数无效", { total });
        return null;
      }
      return { viewportCenter, totalChunks };
    }
    return null;
  },
  resolveNearbyChunk = (
    viewportCenter: number,
    totalChunks: number,
    currentChunk: number,
  ): number | null => {
    if (totalChunks < 2) {
      return null;
    }
    const relativePosition = viewportCenter - (currentChunk - 1),
      direction = relativePosition >= 0.5 ? 1 : -1;
    let nearbyChunk = currentChunk + direction;
    if (nearbyChunk < 1 || nearbyChunk > totalChunks) {
      nearbyChunk = currentChunk - direction;
    }
    if (
      nearbyChunk < 1 ||
      nearbyChunk > totalChunks ||
      nearbyChunk === currentChunk
    ) {
      return null;
    }
    return nearbyChunk;
  },
  resolveUrlKey = (url?: string): string | null => {
    if (typeof url !== "string") {
      return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  },
  resolveGetPageSegmentNumber = (
    pageNumber: number | undefined,
    content: string,
  ): number | undefined => {
    if (Number.isInteger(pageNumber) && pageNumber > 0) {
      return pageNumber;
    }
    const viewportPlan = resolveViewportChunkPlan(content);
    if (!viewportPlan) {
      return undefined;
    }
    return viewportPlan.currentChunk;
  },
  resolveErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return "未知错误";
  },
  parseToolCallArguments = (call: ToolCall, toolLabel: string): JsonValue => {
    const rawArgs = getToolCallArguments(call);
    if (typeof rawArgs !== "string") {
      return rawArgs;
    }
    try {
      return parseToolArguments(rawArgs || "{}");
    } catch (error) {
      throw new Error(
        `${toolLabel} 工具参数解析失败：${resolveErrorMessage(error)}`,
      );
    }
  },
  urlLabelPattern = /^(?:\*\*)?URL[:：](?:\*\*)?$/i,
  extractUrlFromGetPageOutput = (content: string): string | null => {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i += 1) {
      const line = lines[i].trim();
      if (
        line === t("statusUrlLabel") ||
        line === t("statusUrlPlain") ||
        urlLabelPattern.test(line)
      ) {
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
    const pageNumber = resolvePageNumberKey(event.pageNumber),
      urlKey = resolveUrlKey(event.url);
    if (urlKey) {
      return `${urlKey}:${String(pageNumber)}`;
    }
    return `${String(event.tabId)}:${String(pageNumber)}`;
  },
  extractGetPageInfoFromCall = (call: ToolCall): GetPageArgs =>
    getToolValidator<GetPageArgs>(toolNames.getPageMarkdown)(
      parseToolCallArguments(call, "get_page"),
    ),
  extractOpenPageInfoFromCall = (call: ToolCall): OpenPageArgs =>
    getToolValidator<OpenPageArgs>(toolNames.openBrowserPage)(
      parseToolCallArguments(call, "open_page"),
    ),
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
      t("statusOpenSuccess"),
      toolNames.openBrowserPage,
    ),
  extractClickButtonTabIdFromMessage = (message: Message) => {
    const storedTabId = message.pageReadTabId;
    if (Number.isInteger(storedTabId) && storedTabId > 0) {
      return storedTabId;
    }
    const tabId = extractPageReadTabIdFromOutput(
      message.content,
      t("statusClickSuccess"),
      toolNames.clickButton,
    );
    if (!tabId) {
      return null;
    }
    return tabId;
  },
  isGetPageSuccessOutput = (content: unknown): content is string =>
    typeof content === "string" &&
    content.trim().startsWith(t("statusReadSuccess"));

export const resolveViewportChunkPlan = (
  content: string,
): ViewportChunkPlan | null => {
  const matched = parseViewportCenterValues(content);
  if (!matched) {
    return null;
  }
  const viewportCenter = clampChunk(
      matched.viewportCenter,
      1,
      matched.totalChunks,
    ),
    currentChunk = clampChunk(
      Math.ceil(viewportCenter),
      1,
      matched.totalChunks,
    );
  return {
    viewportCenter,
    totalChunks: matched.totalChunks,
    currentChunk,
    nearbyChunk: resolveNearbyChunk(
      viewportCenter,
      matched.totalChunks,
      currentChunk,
    ),
  };
};

export const collectPageReadDedupeSets = (messages: Message[]) => {
  const callInfoById = new Map<string, PageReadCallInfo>();
  messages.forEach((msg) => {
    if (!Array.isArray(msg.tool_calls)) {
      return;
    }
    msg.tool_calls.forEach((call) => {
      const callId = getToolCallId(call),
        name = getToolCallName(call);
      if (callInfoById.has(callId)) {
        const existing = callInfoById.get(callId);
        if (existing?.name !== name) {
          throw new Error(`重复的工具调用 ID：${callId}`);
        }
        return;
      }
      const info: PageReadCallInfo = { name };
      if (name === toolNames.getPageMarkdown) {
        const { tabId, pageNumber } = extractGetPageInfoFromCall(call);
        info.tabId = tabId;
        info.pageNumber = pageNumber;
      }
      if (name === toolNames.openBrowserPage) {
        const { pageNumber, url } = extractOpenPageInfoFromCall(call);
        info.pageNumber = pageNumber;
        info.url = url;
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
    if (name === toolNames.getPageMarkdown) {
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
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
        pageNumber: resolveGetPageSegmentNumber(info.pageNumber, content),
        url: url || undefined,
      });
      return;
    }
    if (name === toolNames.openBrowserPage) {
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
        url: info?.url,
      });
      return;
    }
    if (name === toolNames.clickButton) {
      const tabId = extractClickButtonTabIdFromMessage(msg);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
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
    if (event.type === toolNames.getPageMarkdown) {
      removeToolCallIds.add(event.callId);
      return;
    }
    if (
      event.type === toolNames.openBrowserPage ||
      event.type === toolNames.clickButton
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
    ? `**${t("statusSuccess")}**`
    : (() => {
        if (typeof msg.content !== "string") {
          throw new Error("工具响应内容无效");
        }
        return msg.content;
      })();
