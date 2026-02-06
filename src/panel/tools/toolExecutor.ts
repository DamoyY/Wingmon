import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolModule,
  parseToolArguments,
  toolNames,
  type JsonValue,
  type ToolCall,
} from "./definitions.ts";
import { buildToolErrorOutput, defaultToolSuccessOutput } from "./output.ts";
import ToolInputError from "./errors.ts";

type NormalizedToolCall = {
  id: string;
  call_id: string;
  name: string;
  arguments: string | JsonValue;
};

type ToolOutput = {
  content: string;
  pageReadTabId?: number;
};

type ToolMessage = {
  role: "tool";
  content: string;
  tool_call_id: string;
  name: string;
  pageReadTabId?: number;
};

const normalizeToolCall = (
    toolCall: ToolCall | null,
  ): NormalizedToolCall | null => {
    if (!toolCall) {
      return null;
    }
    if (toolCall.function) {
      const { id } = toolCall,
        name = toolCall.function.name,
        args = getToolCallArguments(toolCall);
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
  },
  resolveToolArguments = (rawArgs: string | JsonValue): JsonValue =>
    typeof rawArgs === "string" ? parseToolArguments(rawArgs || "{}") : rawArgs,
  isToolOutputRecord = (
    value: unknown,
  ): value is { content?: unknown; pageReadTabId?: unknown } =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  hasMessageField = (value: unknown): value is { message?: unknown } =>
    typeof value === "object" && value !== null && "message" in value,
  executeTool = (name: string, args: JsonValue): Promise<unknown> => {
    const tool = getToolModule(name);
    return Promise.resolve(tool.execute(tool.validateArgs(args)));
  },
  executeToolCall = async (toolCall: ToolCall): Promise<unknown> => {
    const normalized = normalizeToolCall(toolCall);
    if (!normalized) {
      throw new ToolInputError("工具调用格式不正确");
    }
    const args = resolveToolArguments(normalized.arguments);
    return executeTool(normalized.name, args);
  },
  resolveToolOutput = (output: unknown, name: string): ToolOutput => {
    if (typeof output === "string") {
      return { content: output };
    }
    if (!isToolOutputRecord(output)) {
      throw new Error(`工具输出无效：${name}`);
    }
    if (typeof output.content !== "string") {
      throw new Error(`工具输出内容无效：${name}`);
    }
    const result: ToolOutput = { content: output.content };
    if ("pageReadTabId" in output) {
      const { pageReadTabId } = output;
      if (!Number.isInteger(pageReadTabId) || pageReadTabId <= 0) {
        throw new Error(`工具输出 TabID 无效：${name}`);
      }
      result.pageReadTabId = pageReadTabId;
    }
    return result;
  };
export const buildPageMarkdownToolOutput = async (
  tabId: number,
  pageNumber: number,
): Promise<string> => {
  const args: { tabId: number; page_number: number } = {
    tabId,
    page_number: pageNumber,
  };
  const output = await executeTool(toolNames.getPageMarkdown, args);
  return resolveToolOutput(output, toolNames.getPageMarkdown).content;
};
const buildToolMessage = ({
    callId,
    name,
    content,
    pageReadTabId,
  }: {
    callId: string;
    name: string;
    content: string;
    pageReadTabId: number | null;
  }): ToolMessage => {
    const message: ToolMessage = {
      role: "tool",
      content,
      tool_call_id: callId,
      name,
    };
    if (pageReadTabId !== null) {
      message.pageReadTabId = pageReadTabId;
    }
    return message;
  },
  resolveErrorMessage = (error: unknown): string => {
    if (error === null || error === undefined) {
      return "未知错误";
    }
    if (error instanceof Error) {
      return error.message || "未知错误";
    }
    if (typeof error === "string") {
      return error.trim() ? error : "未知错误";
    }
    if (typeof error === "number" || typeof error === "boolean") {
      return String(error);
    }
    if (hasMessageField(error)) {
      const { message } = error;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
    return "未知错误";
  },
  executeToolCallToMessage = async (call: ToolCall): Promise<ToolMessage> => {
    let callId = "",
      name = "",
      output: string = defaultToolSuccessOutput,
      pageReadTabId: number | null = null;
    try {
      callId = getToolCallId(call);
      name = getToolCallName(call);
      const resolved = resolveToolOutput(await executeToolCall(call), name);
      output = resolved.content;
      pageReadTabId = resolved.pageReadTabId ?? null;
    } catch (error) {
      const isInputError = error instanceof ToolInputError;
      const errorMessage = resolveErrorMessage(error);
      console.error(`工具执行失败: ${name || "未知工具"}`, errorMessage);
      output = buildToolErrorOutput({
        message: errorMessage,
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
export const handleToolCalls = async (
  toolCalls: ToolCall[],
  signal?: AbortSignal | null,
): Promise<ToolMessage[]> => {
  const messages: ToolMessage[] = [];
  for (const call of toolCalls) {
    if (signal?.aborted) {
      break;
    }
    const message = await executeToolCallToMessage(call);
    messages.push(message);
  }
  return messages;
};
