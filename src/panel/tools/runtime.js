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

const normalizeToolCall = (toolCall) => {
    if (!toolCall) {
      return null;
    }
    if (toolCall.function) {
      const { id } = toolCall,
        name = toolCall.function?.name,
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
  executeTool = async (name, args) => {
    const tool = getToolModule(name);
    return tool.execute(tool.validateArgs(args));
  },
  executeToolCall = async (toolCall) => {
    const normalized = normalizeToolCall(toolCall);
    if (!normalized) {
      throw new ToolInputError("工具调用格式不正确");
    }
    const args = parseToolArguments(normalized.arguments || "{}");
    return executeTool(normalized.name, args);
  },
  resolveToolOutput = (output, name) => {
    if (typeof output === "string") {
      return { content: output };
    }
    if (!output || typeof output !== "object") {
      throw new Error(`工具输出无效：${name}`);
    }
    if (typeof output.content !== "string") {
      throw new Error(`工具输出内容无效：${name}`);
    }
    const result = { content: output.content };
    if (output.pageReadTabId !== undefined) {
      if (
        !Number.isInteger(output.pageReadTabId) ||
        output.pageReadTabId <= 0
      ) {
        throw new Error(`工具输出 TabID 无效：${name}`);
      }
      result.pageReadTabId = output.pageReadTabId;
    }
    return result;
  };
export const buildPageMarkdownToolOutput = async (tabId) => {
  const output = await executeTool(toolNames.getPageMarkdown, { tabId });
  return resolveToolOutput(output, toolNames.getPageMarkdown).content;
};
const buildToolMessage = ({ callId, name, content, pageReadTabId }) => ({
    role: "tool",
    content,
    tool_call_id: callId,
    name,
    pageReadTabId,
  }),
  executeToolCallToMessage = async (call) => {
    let callId,
      name,
      output = defaultToolSuccessOutput,
      pageReadTabId;
    try {
      callId = getToolCallId(call);
      name = getToolCallName(call);
      const resolved = resolveToolOutput(await executeToolCall(call), name);
      output = resolved.content;
      pageReadTabId = resolved.pageReadTabId;
    } catch (error) {
      const isInputError = error instanceof ToolInputError;
      console.error(
        `工具执行失败: ${name || "未知工具"}`,
        error?.message || "未知错误",
      );
      output = buildToolErrorOutput({
        message: error?.message,
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
export const handleToolCalls = async (toolCalls) => {
  const messages = [];
  await toolCalls.reduce(async (promise, call) => {
    await promise;
    const message = await executeToolCallToMessage(call);
    messages.push(message);
  }, Promise.resolve());
  return messages;
};
