import {
  type JsonValue,
  type ToolCall,
  type ToolExecutionContext,
  type ToolMessageContext,
  type ToolModule,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolModule,
  parseToolArguments,
  toolNames,
} from "./definitions.ts";
import { buildToolErrorOutput, defaultToolSuccessOutput } from "./output.ts";
import {
  closeTab,
  createTab,
  focusTab,
  getAllTabs,
  saveHtmlPreview,
  sendMessageToSandbox,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.ts";
import {
  fetchPageMarkdownData,
  shouldFollowMode,
  syncPageHash,
} from "./pageReadHelpers.ts";
import ToolInputError from "./errors.ts";
import { extractErrorMessage } from "../../../shared/index.ts";

type ToolOutput = {
  content: string;
  toolContext: ToolMessageContext | null;
};

type ToolMessage = {
  role: "tool";
  content: string;
  tool_call_id: string;
  name: string;
  toolContext?: ToolMessageContext;
};

const sendMessageToSandboxWithType: ToolExecutionContext["sendMessageToSandbox"] =
    async (payload, timeoutMs) =>
      await sendMessageToSandbox(payload, timeoutMs),
  saveHtmlPreviewWithType: ToolExecutionContext["saveHtmlPreview"] = async (
    args,
  ) => {
    const previewId = await saveHtmlPreview(args);
    if (!previewId.trim()) {
      console.error("HTML 预览保存失败", previewId);
      throw new Error("HTML 预览保存失败");
    }
    return previewId;
  },
  getRuntimeUrl: ToolExecutionContext["getRuntimeUrl"] = (path) =>
    chrome.runtime.getURL(path);

export const defaultToolExecutionContext: ToolExecutionContext = {
  closeTab,
  createTab,
  fetchPageMarkdownData,
  focusTab,
  getAllTabs,
  getRuntimeUrl,
  saveHtmlPreview: saveHtmlPreviewWithType,
  sendMessageToSandbox: sendMessageToSandboxWithType,
  sendMessageToTab,
  shouldFollowMode,
  syncPageHash,
  waitForContentScript,
};

const resolveToolArguments = (rawArgs: string | JsonValue): JsonValue =>
    typeof rawArgs === "string" ? parseToolArguments(rawArgs || "{}") : rawArgs,
  isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  serializeToolOutput = (output: unknown, name: string): string => {
    if (
      typeof output === "string" ||
      typeof output === "number" ||
      typeof output === "boolean"
    ) {
      return String(output);
    }
    try {
      const serialized = JSON.stringify(output);
      if (typeof serialized !== "string") {
        throw new Error(`工具输出不可序列化：${name}`);
      }
      return serialized;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "工具输出序列化失败";
      throw new Error(`工具输出序列化失败：${name}，${message}`);
    }
  },
  resolveToolContent = (
    tool: ToolModule,
    output: unknown,
    name: string,
  ): string => {
    if (typeof tool.formatResult === "function") {
      const formatted = tool.formatResult(output as JsonValue);
      if (typeof formatted !== "string") {
        throw new Error(`工具格式化输出无效：${name}`);
      }
      return formatted;
    }
    if (typeof output === "string") {
      return output;
    }
    if (isRecord(output) && typeof output.content === "string") {
      return output.content;
    }
    return serializeToolOutput(output, name);
  },
  resolveToolContext = (
    tool: ToolModule,
    args: JsonValue,
    output: unknown,
    name: string,
  ): ToolMessageContext | null => {
    if (typeof tool.buildMessageContext !== "function") {
      return null;
    }
    const context = tool.buildMessageContext(args, output as JsonValue);
    if (context === null) {
      return null;
    }
    if (!isRecord(context)) {
      throw new Error(`工具上下文无效：${name}`);
    }
    return context;
  },
  executeTool = async (
    name: string,
    rawArgs: string | JsonValue,
    context: ToolExecutionContext,
  ): Promise<{
    tool: ToolModule;
    args: JsonValue;
    output: unknown;
  }> => {
    const tool = getToolModule(name),
      parsedArgs = resolveToolArguments(rawArgs),
      validatedArgs = tool.validateArgs(parsedArgs),
      output = await Promise.resolve(tool.execute(validatedArgs, context));
    return { args: validatedArgs, output, tool };
  },
  resolveToolOutput = ({
    tool,
    args,
    output,
    name,
  }: {
    tool: ToolModule;
    args: JsonValue;
    output: unknown;
    name: string;
  }): ToolOutput => ({
    content: resolveToolContent(tool, output, name),
    toolContext: resolveToolContext(tool, args, output, name),
  });

export const buildPageMarkdownToolOutput = async (
  tabId: number,
  pageNumber: number,
  context: ToolExecutionContext = defaultToolExecutionContext,
): Promise<string> => {
  const args: { tabId: number; page_number: number } = {
      page_number: pageNumber,
      tabId,
    },
    { tool, output } = await executeTool(
      toolNames.getPageMarkdown,
      args,
      context,
    );
  return resolveToolContent(tool, output, toolNames.getPageMarkdown);
};

const buildToolMessage = ({
    callId,
    name,
    content,
    toolContext,
  }: {
    callId: string;
    name: string;
    content: string;
    toolContext: ToolMessageContext | null;
  }): ToolMessage => {
    const message: ToolMessage = {
      content,
      name,
      role: "tool",
      tool_call_id: callId,
    };
    if (toolContext !== null) {
      message.toolContext = toolContext;
    }
    return message;
  },
  executeToolCallToMessage = async (
    call: ToolCall,
    context: ToolExecutionContext,
  ): Promise<ToolMessage> => {
    let callId = "",
      name = "",
      output: string = defaultToolSuccessOutput,
      toolContext: ToolMessageContext | null = null;
    try {
      callId = getToolCallId(call);
      name = getToolCallName(call);
      const rawArgs = getToolCallArguments(call),
        resolved = resolveToolOutput({
          ...(await executeTool(name, rawArgs, context)),
          name,
        });
      output = resolved.content;
      toolContext = resolved.toolContext;
    } catch (error) {
      const isInputError = error instanceof ToolInputError,
        tabId = isInputError ? error.tabId : null,
        errorMessage = extractErrorMessage(error, {
          includeNonStringPrimitives: true,
        });
      console.error(`工具执行失败: ${name || "未知工具"}`, errorMessage);
      output = buildToolErrorOutput({
        isCloseTool: name === toolNames.closeBrowserPage,
        isFindTool: name === toolNames.find,
        isInputError,
        isOpenTool: name === toolNames.openBrowserPage,
        message: errorMessage,
        tabId,
      });
    }
    if (!callId || !name) {
      throw new ToolInputError("工具调用缺少 call_id 或 name");
    }
    return buildToolMessage({
      callId,
      content: output,
      name,
      toolContext,
    });
  };

export const handleToolCalls = async (
  toolCalls: ToolCall[],
  signal?: AbortSignal | null,
  context: ToolExecutionContext = defaultToolExecutionContext,
): Promise<ToolMessage[]> => {
  const messages: ToolMessage[] = [];
  for (const call of toolCalls) {
    if (signal?.aborted) {
      break;
    }
    const message = await executeToolCallToMessage(call, context);
    messages.push(message);
  }
  return messages;
};
