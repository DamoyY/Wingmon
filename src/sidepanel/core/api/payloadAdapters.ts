import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type {
  ChatFallbackRequestBody,
  ChatRequestBody,
  MessagesApiStrategy,
  ResponsesFallbackRequestBody,
  ResponsesRequestBody,
} from "./apiContracts.ts";
import type {
  ResponseInputItem,
  Tool as ResponsesTool,
} from "openai/resources/responses/responses";
import { applyBodyOverrideRules, isRecord } from "../../../shared/index.ts";
import {
  buildChatMessages,
  buildMessagesInput,
  buildResponsesInput,
} from "../agent/message-builders.ts";
import type Anthropic from "@anthropic-ai/sdk";
import type { Settings } from "../services/index.ts";
import type { ToolDefinition } from "../agent/definitions.ts";

type MessagesRequestBody = ReturnType<
  MessagesApiStrategy["buildStreamRequestBody"]
>;
type MessagesFallbackRequestBody = ReturnType<
  MessagesApiStrategy["buildNonStreamRequestBody"]
>;

const readStringField = (source: unknown, field: string): string | null => {
    if (!isRecord(source)) {
      return null;
    }
    const value = source[field];
    if (typeof value !== "string") {
      return null;
    }
    return value;
  },
  applySettingsRequestBodyOverrides = <TBody extends Record<string, unknown>>(
    settings: Settings,
    body: TBody,
  ): TBody => {
    if (settings.requestBodyOverrides.trim() === "") {
      return body;
    }
    return applyBodyOverrideRules(body, settings.requestBodyOverrides);
  },
  normalizeToolArguments = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      Array.isArray(value) ||
      isRecord(value)
    ) {
      try {
        const serialized = JSON.stringify(value);
        if (typeof serialized !== "string") {
          throw new Error("工具参数序列化结果无效");
        }
        return serialized;
      } catch (error) {
        console.error("工具参数序列化失败", error);
        throw new Error("工具参数序列化失败");
      }
    }
    throw new Error("工具参数类型无效");
  },
  toChatMessageToolCall = (value: unknown): ChatCompletionMessageToolCall => {
    if (!isRecord(value)) {
      throw new Error("助手工具调用格式无效");
    }
    const idValue = value.id,
      typeValue = value.type,
      functionValue = value.function;
    if (typeof idValue !== "string" || idValue.length === 0) {
      throw new Error("助手工具调用缺少 id");
    }
    if (typeValue !== "function") {
      throw new Error("助手工具调用 type 必须为 function");
    }
    if (!isRecord(functionValue)) {
      throw new Error("助手工具调用缺少 function");
    }
    if (
      typeof functionValue.name !== "string" ||
      functionValue.name.length === 0
    ) {
      throw new Error("助手工具调用缺少函数名");
    }
    return {
      function: {
        arguments: normalizeToolArguments(functionValue.arguments),
        name: functionValue.name,
      },
      id: idValue,
      type: "function",
    };
  },
  normalizeChatToolCallList = (
    value: unknown,
  ): ChatCompletionMessageToolCall[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(toChatMessageToolCall);
  },
  toChatMessageParam = (
    message: ReturnType<typeof buildChatMessages>[number],
  ): ChatCompletionMessageParam => {
    const role = message.role;
    if (role === "system" || role === "developer" || role === "user") {
      if (typeof message.content !== "string") {
        throw new Error(`${role} 消息缺少 content`);
      }
      return { content: message.content, role } as ChatCompletionMessageParam;
    }
    if (role === "tool") {
      if (typeof message.content !== "string") {
        throw new Error("tool 消息缺少 content");
      }
      const toolCallId = readStringField(message, "tool_call_id");
      if (toolCallId === null || toolCallId.length === 0) {
        throw new Error("tool 消息缺少 tool_call_id");
      }
      return {
        content: message.content,
        role: "tool",
        tool_call_id: toolCallId,
      };
    }
    if (role === "assistant") {
      const entry: ChatCompletionAssistantMessageParam = {
          role: "assistant",
        },
        toolCalls = normalizeChatToolCallList(message.tool_calls);
      if (
        typeof message.content === "string" &&
        message.content.trim().length > 0
      ) {
        entry.content = message.content;
      }
      if (toolCalls.length > 0) {
        entry.tool_calls = toolCalls;
      }
      if (
        entry.content === undefined &&
        (entry.tool_calls === undefined || entry.tool_calls.length === 0)
      ) {
        throw new Error("assistant 消息缺少 content 和 tool_calls");
      }
      return entry;
    }
    throw new Error(`不支持的 Chat 消息角色：${role}`);
  },
  toResponsesInputItem = (
    item: ReturnType<typeof buildResponsesInput>[number],
  ): ResponseInputItem => {
    if ("role" in item) {
      if (typeof item.content !== "string") {
        throw new Error(`${item.role} 消息缺少 content`);
      }
      return {
        content: item.content,
        role: item.role,
      } as ResponseInputItem;
    }
    if (item.type === "function_call") {
      return {
        arguments: normalizeToolArguments(item.arguments),
        call_id: item.call_id,
        name: item.name,
        type: "function_call",
      };
    }
    return {
      call_id: item.call_id,
      output: item.output,
      type: "function_call_output",
    };
  },
  toChatTool = (tool: ToolDefinition): ChatCompletionTool => {
    const t = "function" in tool ? tool.function : tool;
    return {
      function: {
        description: t.description,
        name: t.name,
        parameters: t.parameters as Record<string, unknown>,
        strict: t.strict,
      },
      type: "function",
    };
  },
  toResponsesTool = (tool: ToolDefinition): ResponsesTool => {
    const t = "function" in tool ? tool.function : tool;
    return {
      description: t.description,
      name: t.name,
      parameters: t.parameters as Record<string, unknown>,
      strict: t.strict,
      type: "function",
    };
  },
  toAnthropicTool = (tool: ToolDefinition): Anthropic.Tool => {
    const t = "function" in tool ? tool.function : tool;
    return {
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
      name: t.name,
    };
  };

export const buildChatStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildChatMessages>[1],
): ChatRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    messages: buildChatMessages(systemPrompt, messages).map(toChatMessageParam),
    model: settings.model,
    stream: true,
    tools: tools.map(toChatTool),
  });

export const buildChatNonStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildChatMessages>[1],
): ChatFallbackRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    messages: buildChatMessages(systemPrompt, messages).map(toChatMessageParam),
    model: settings.model,
    stream: false,
    tools: tools.map(toChatTool),
  });

export const buildMessagesStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildMessagesInput>[0],
): MessagesRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    messages: buildMessagesInput(messages) as MessagesRequestBody["messages"],
    model: settings.model,
    stream: true,
    tools: tools.map(toAnthropicTool),
    max_tokens: 64000,
    ...(systemPrompt ? { system: systemPrompt } : {}),
  });

export const buildMessagesNonStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildMessagesInput>[0],
): MessagesFallbackRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    messages: buildMessagesInput(
      messages,
    ) as MessagesFallbackRequestBody["messages"],
    model: settings.model,
    stream: false,
    tools: tools.map(toAnthropicTool),
    max_tokens: 64000,
    ...(systemPrompt ? { system: systemPrompt } : {}),
  });

export const buildResponsesStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildResponsesInput>[0],
): ResponsesRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    input: buildResponsesInput(messages).map(toResponsesInputItem),
    model: settings.model,
    stream: true,
    tools: tools.map(toResponsesTool),
    ...(systemPrompt ? { instructions: systemPrompt } : {}),
  });

export const buildResponsesNonStreamRequestBody = (
  settings: Settings,
  systemPrompt: string,
  tools: ToolDefinition[],
  messages: Parameters<typeof buildResponsesInput>[0],
): ResponsesFallbackRequestBody =>
  applySettingsRequestBodyOverrides(settings, {
    input: buildResponsesInput(messages).map(toResponsesInputItem),
    model: settings.model,
    stream: false,
    tools: tools.map(toResponsesTool),
    ...(systemPrompt ? { instructions: systemPrompt } : {}),
  });
