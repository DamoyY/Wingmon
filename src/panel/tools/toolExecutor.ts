import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolModule,
  parseToolArguments,
  toolNames,
} from "./definitions.js";
import { buildToolErrorOutput, defaultToolSuccessOutput } from "./output.js";
import ToolInputError from "./errors.js";

type ToolCallFunction = {
  name?: string;
  arguments?: string;
};

type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

type ToolCall = {
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: JsonValue;
  function?: ToolCallFunction;
};

type NormalizedToolCall = {
  id: string;
  call_id: string;
  name: string;
  arguments: JsonValue;
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

type ToolArguments = JsonValue;

type ToolResult = JsonValue;

type ToolModule = {
  execute: (args: ToolArguments) => ToolResult | Promise<ToolResult>;
  validateArgs: (args: ToolArguments) => ToolArguments;
};

type ToolErrorOutputArgs = {
  message?: string;
  isInputError: boolean;
  isCloseTool: boolean;
};

type ToolInputErrorCtor = new (message: string) => Error;

type ErrorLike =
  | Error
  | { message?: string }
  | string
  | number
  | boolean
  | null;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor,
  getToolCallArgumentsSafe = getToolCallArguments as (
    call: ToolCall,
  ) => JsonValue,
  getToolCallIdSafe = getToolCallId as (call: ToolCall) => string,
  getToolCallNameSafe = getToolCallName as (call: ToolCall) => string,
  getToolModuleSafe = getToolModule as (name: string) => ToolModule,
  parseToolArgumentsSafe = parseToolArguments as (text: string) => JsonValue,
  buildToolErrorOutputSafe = buildToolErrorOutput as (
    args: ToolErrorOutputArgs,
  ) => string,
  defaultToolSuccessOutputSafe = defaultToolSuccessOutput as string,
  toolNamesSafe = toolNames as {
    getPageMarkdown: string;
    closeBrowserPage: string;
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
        args = getToolCallArgumentsSafe(toolCall);
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
  resolveToolArguments = (rawArgs: JsonValue): ToolArguments =>
    typeof rawArgs === "string"
      ? parseToolArgumentsSafe(rawArgs || "{}")
      : rawArgs,
  executeTool = (name: string, args: ToolArguments): Promise<ToolResult> => {
    const tool = getToolModuleSafe(name);
    return Promise.resolve(tool.execute(tool.validateArgs(args)));
  },
  executeToolCall = async (toolCall: ToolCall): Promise<ToolResult> => {
    const normalized = normalizeToolCall(toolCall);
    if (!normalized) {
      throw new ToolInputErrorSafe("工具调用格式不正确");
    }
    const args = resolveToolArguments(normalized.arguments);
    return executeTool(normalized.name, args);
  },
  resolveToolOutput = (output: ToolResult, name: string): ToolOutput => {
    if (typeof output === "string") {
      return { content: output };
    }
    if (!output || typeof output !== "object" || Array.isArray(output)) {
      throw new Error(`工具输出无效：${name}`);
    }
    const outputRecord = output as Record<string, JsonValue>;
    if (typeof outputRecord.content !== "string") {
      throw new Error(`工具输出内容无效：${name}`);
    }
    const result: ToolOutput = { content: outputRecord.content };
    if ("pageReadTabId" in outputRecord) {
      const pageReadTabId = outputRecord.pageReadTabId;
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
  const output = await executeTool(toolNamesSafe.getPageMarkdown, args);
  return resolveToolOutput(output, toolNamesSafe.getPageMarkdown).content;
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
  resolveErrorMessage = (error: ErrorLike): string => {
    if (error == null) {
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
    if (typeof error === "object" && "message" in error) {
      const message = error.message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
    return "未知错误";
  },
  executeToolCallToMessage = async (call: ToolCall): Promise<ToolMessage> => {
    let callId = "",
      name = "",
      output: string = defaultToolSuccessOutputSafe,
      pageReadTabId: number | null = null;
    try {
      callId = getToolCallIdSafe(call);
      name = getToolCallNameSafe(call);
      const resolved = resolveToolOutput(await executeToolCall(call), name);
      output = resolved.content;
      pageReadTabId = resolved.pageReadTabId ?? null;
    } catch (error) {
      const safeError = error as ErrorLike;
      const isInputError = safeError instanceof ToolInputErrorSafe;
      const errorMessage = resolveErrorMessage(safeError);
      console.error(`工具执行失败: ${name || "未知工具"}`, errorMessage);
      output = buildToolErrorOutputSafe({
        message: errorMessage,
        isInputError,
        isCloseTool: name === toolNamesSafe.closeBrowserPage,
      });
    }
    if (!callId || !name) {
      throw new ToolInputErrorSafe("工具调用缺少 call_id 或 name");
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
