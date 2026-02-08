import {
  type ToolCall,
  type ToolMessageContext,
  type ToolPageReadDedupeAction,
  getToolCallId,
  getToolCallName,
  getToolModule,
} from "./definitions.ts";
import { parseRequiredPositiveInteger } from "./validation/index.js";

type Message = {
  role?: string;
  content?: unknown;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  toolContext?: unknown;
};

type ToolCallInfo = {
  name: string;
  dedupeAction: ToolPageReadDedupeAction | null;
};

type PageReadEventBase = {
  tabId: number;
  pageNumber?: number;
  url?: string;
};

type PageReadEvent = PageReadEventBase & {
  dedupeAction: ToolPageReadDedupeAction;
  callId: string;
  index: number;
  key: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  resolveOptionalOutputWithoutContent = (
    toolContext: unknown,
  ): string | null => {
    if (!isRecord(toolContext)) {
      return null;
    }
    const { outputWithoutContent } = toolContext as ToolMessageContext;
    if (outputWithoutContent === undefined) {
      return null;
    }
    if (typeof outputWithoutContent !== "string") {
      throw new Error("工具上下文 outputWithoutContent 无效");
    }
    if (!outputWithoutContent.trim()) {
      throw new Error("工具上下文 outputWithoutContent 不能为空");
    }
    return outputWithoutContent.trimEnd();
  },
  resolveOptionalPositiveInteger = (
    value: unknown,
    fieldName: string,
  ): number | undefined => {
    if (value === undefined) {
      return undefined;
    }
    return parseRequiredPositiveInteger(value, fieldName);
  },
  resolveOptionalUrl = (
    value: unknown,
    fieldName: string,
  ): string | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      throw new Error(`${fieldName} 必须是字符串`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed;
  },
  resolvePageReadEvent = (toolContext: unknown): PageReadEventBase | null => {
    if (!isRecord(toolContext)) {
      return null;
    }
    const { pageReadEvent: rawPageReadEvent } =
      toolContext as ToolMessageContext;
    if (rawPageReadEvent === undefined) {
      return null;
    }
    if (!isRecord(rawPageReadEvent)) {
      throw new Error("工具上下文 pageReadEvent 无效");
    }
    const tabId = parseRequiredPositiveInteger(
        rawPageReadEvent.tabId,
        "toolContext.pageReadEvent.tabId",
      ),
      pageNumber = resolveOptionalPositiveInteger(
        rawPageReadEvent.pageNumber,
        "toolContext.pageReadEvent.pageNumber",
      ),
      url = resolveOptionalUrl(
        rawPageReadEvent.url,
        "toolContext.pageReadEvent.url",
      );
    return {
      tabId,
      ...(pageNumber === undefined ? {} : { pageNumber }),
      ...(url === undefined ? {} : { url }),
    };
  },
  resolvePageReadDedupeAction = (
    name: string,
  ): ToolPageReadDedupeAction | null => {
    try {
      return getToolModule(name).pageReadDedupeAction ?? null;
    } catch (error) {
      console.error(`工具去重策略读取失败：${name}`, error);
      return null;
    }
  },
  resolvePageNumberKey = (pageNumber?: number): number =>
    Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
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
  buildPageReadKey = (event: PageReadEventBase): string => {
    const pageNumber = resolvePageNumberKey(event.pageNumber),
      urlKey = resolveUrlKey(event.url);
    if (urlKey) {
      return `${urlKey}:${String(pageNumber)}`;
    }
    return `${String(event.tabId)}:${String(pageNumber)}`;
  },
  collectToolCallInfo = (messages: Message[]): Map<string, ToolCallInfo> => {
    const callInfoById = new Map<string, ToolCallInfo>();
    messages.forEach((message) => {
      if (!Array.isArray(message.tool_calls)) {
        return;
      }
      message.tool_calls.forEach((call) => {
        const callId = getToolCallId(call),
          name = getToolCallName(call);
        const existing = callInfoById.get(callId);
        if (existing) {
          if (existing.name !== name) {
            throw new Error(`重复的工具调用 ID：${callId}`);
          }
          return;
        }
        callInfoById.set(callId, {
          dedupeAction: resolvePageReadDedupeAction(name),
          name,
        });
      });
    });
    return callInfoById;
  };

export const collectPageReadDedupeSets = (messages: Message[]) => {
  const callInfoById = collectToolCallInfo(messages),
    readEvents: PageReadEvent[] = [];
  messages.forEach((message, index) => {
    if (message.role !== "tool") {
      return;
    }
    const callId = message.tool_call_id;
    if (!callId) {
      throw new Error("工具响应缺少 tool_call_id");
    }
    const callInfo = callInfoById.get(callId),
      resolvedName = message.name || callInfo?.name;
    if (!resolvedName) {
      throw new Error(`工具响应缺少 name：${callId}`);
    }
    if (callInfo && message.name && callInfo.name !== message.name) {
      throw new Error(`工具调用与响应 name 不一致：${callId}`);
    }
    const dedupeAction =
      callInfo?.dedupeAction ?? resolvePageReadDedupeAction(resolvedName);
    if (!dedupeAction) {
      return;
    }
    const pageReadEvent = resolvePageReadEvent(message.toolContext);
    if (!pageReadEvent) {
      return;
    }
    readEvents.push({
      ...pageReadEvent,
      callId,
      dedupeAction,
      index,
      key: buildPageReadKey(pageReadEvent),
    });
  });
  const latestByKey = new Map<string, PageReadEvent>();
  readEvents.forEach((event) => {
    const existing = latestByKey.get(event.key);
    if (!existing || event.index > existing.index) {
      latestByKey.set(event.key, event);
    }
  });
  const removeToolCallIds = new Set<string>(),
    trimToolResponseIds = new Set<string>();
  readEvents.forEach((event) => {
    const latest = latestByKey.get(event.key);
    if (!latest || latest.callId === event.callId) {
      return;
    }
    if (event.dedupeAction === "removeToolCall") {
      removeToolCallIds.add(event.callId);
      return;
    }
    trimToolResponseIds.add(event.callId);
  });
  return { removeToolCallIds, trimToolResponseIds };
};

export const getToolOutputContent = (
  msg: Message,
  trimToolResponseIds: Set<string>,
): string => {
  if (typeof msg.content !== "string") {
    throw new Error("工具响应内容无效");
  }
  if (trimToolResponseIds.has(msg.tool_call_id || "")) {
    const outputWithoutContent = resolveOptionalOutputWithoutContent(
      msg.toolContext,
    );
    if (outputWithoutContent === null) {
      console.error("工具响应缺少 outputWithoutContent，回退原始输出", msg);
      return msg.content;
    }
    return outputWithoutContent;
  }
  return msg.content;
};
