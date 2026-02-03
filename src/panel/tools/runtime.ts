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

type ToolCall = {
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: unknown;
  function?: ToolCallFunction;
};

type NormalizedToolCall = {
  id: string;
  call_id: string;
  name: string;
  arguments: unknown;
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

type ToolModule = {
  execute: (args: unknown) => unknown;
  validateArgs: (args: unknown) => unknown;
};

type ToolErrorOutputArgs = {
  message?: string;
  isInputError: boolean;
  isCloseTool: boolean;
};

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor,
  getToolCallArgumentsSafe = getToolCallArguments as (call: ToolCall) => string,
  getToolCallIdSafe = getToolCallId as (call: ToolCall) => string,
  getToolCallNameSafe = getToolCallName as (call: ToolCall) => string,
  getToolModuleSafe = getToolModule as (name: string) => ToolModule,
  parseToolArgumentsSafe = parseToolArguments as (text: string) => unknown,
  buildToolErrorOutputSafe = buildToolErrorOutput as (
    args: ToolErrorOutputArgs,
  ) => string,
  defaultToolSuccessOutputSafe = defaultToolSuccessOutput as string,
  toolNamesSafe = toolNames as {
    getPageMarkdown: string;
    closeBrowserPage: string;
  };

const normalizeToolCall = (
    toolCall: ToolCall | null | undefined,
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
  executeTool = (name: string, args: unknown): Promise<unknown> => {
    const tool = getToolModuleSafe(name);
    return Promise.resolve(tool.execute(tool.validateArgs(args)));
  },
  executeToolCall = async (toolCall: ToolCall): Promise<unknown> => {
    const normalized = normalizeToolCall(toolCall);
    if (!normalized) {
      throw new ToolInputErrorSafe("工具调用格式不正确");
    }
    const args = parseToolArgumentsSafe(
      (normalized.arguments || "{}") as string,
    );
    return executeTool(normalized.name, args);
  },
  resolveToolOutput = (output: unknown, name: string): ToolOutput => {
    if (typeof output === "string") {
      return { content: output };
    }
    if (!output || typeof output !== "object") {
      throw new Error(`工具输出无效：${name}`);
    }
    const outputRecord = output as Record<string, unknown>;
    if (typeof outputRecord.content !== "string") {
      throw new Error(`工具输出内容无效：${name}`);
    }
    const result: ToolOutput = { content: outputRecord.content };
    if (outputRecord.pageReadTabId !== undefined) {
      if (
        !Number.isInteger(outputRecord.pageReadTabId) ||
        outputRecord.pageReadTabId <= 0
      ) {
        throw new Error(`工具输出 TabID 无效：${name}`);
      }
      result.pageReadTabId = outputRecord.pageReadTabId as number;
    }
    return result;
  };
export const buildPageMarkdownToolOutput = async (
  tabId: number,
): Promise<string> => {
  const output = await executeTool(toolNamesSafe.getPageMarkdown, { tabId });
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
    pageReadTabId?: number;
  }): ToolMessage => ({
    role: "tool",
    content,
    tool_call_id: callId,
    name,
    pageReadTabId,
  }),
  executeToolCallToMessage = async (call: ToolCall): Promise<ToolMessage> => {
    let callId: string | undefined,
      name: string | undefined,
      output: string = defaultToolSuccessOutputSafe,
      pageReadTabId: number | undefined;
    try {
      callId = getToolCallIdSafe(call);
      name = getToolCallNameSafe(call);
      const resolved = resolveToolOutput(await executeToolCall(call), name);
      output = resolved.content;
      pageReadTabId = resolved.pageReadTabId;
    } catch (error) {
      const isInputError = error instanceof ToolInputErrorSafe;
      console.error(
        `工具执行失败: ${name || "未知工具"}`,
        (error as Error | undefined)?.message || "未知错误",
      );
      output = buildToolErrorOutputSafe({
        message: (error as Error | undefined)?.message,
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
