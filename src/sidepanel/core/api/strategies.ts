import {
  type AnthropicToolCallCollector,
  type addAnthropicToolCallEvent,
  type addChatToolCallDelta,
  type addResponsesToolCallEvent,
  type extractAnthropicToolCalls,
  type extractChatToolCalls,
  type extractResponsesToolCalls,
  type finalizeAnthropicToolCalls,
  type finalizeChatToolCalls,
  type finalizeResponsesToolCalls,
} from "../agent/toolCallNormalization.ts";
import {
  type ApiRequestChunk,
  extractResponsesText,
  getChatDeltaText,
  getChatToolCallDeltas,
  getResponsesDeltaText,
  getResponsesToolCallEventPayload,
  getToolCallsFromChatDeltas,
  getToolCallsFromResponsesEvent,
} from "./sse.ts";
import type { ApiType, Settings } from "../services/index.ts";
import type {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseInputItem,
  ResponseStreamEvent,
  Tool as ResponsesTool,
} from "openai/resources/responses/responses";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import {
  type buildChatMessages,
  type buildMessagesInput,
  type buildResponsesInput,
} from "../agent/message-builders.ts";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageRecord } from "../store/index.ts";
import { applyBodyOverrideRules } from "../../../shared/index.ts";

export type { ApiRequestChunk } from "./sse.ts";

type StreamEventHandlers = {
  onDelta: (delta: string) => void;
  onChunk: (chunk: ApiRequestChunk) => void;
};

export type ApiToolAdapter = {
  addChatToolCallDelta: typeof addChatToolCallDelta;
  addResponsesToolCallEvent: typeof addResponsesToolCallEvent;
  addAnthropicToolCallEvent: typeof addAnthropicToolCallEvent;
  buildChatMessages: typeof buildChatMessages;
  buildResponsesInput: typeof buildResponsesInput;
  buildMessagesInput: typeof buildMessagesInput;
  extractChatToolCalls: typeof extractChatToolCalls;
  extractResponsesToolCalls: typeof extractResponsesToolCalls;
  extractAnthropicToolCalls: typeof extractAnthropicToolCalls;
  finalizeChatToolCalls: typeof finalizeChatToolCalls;
  finalizeResponsesToolCalls: typeof finalizeResponsesToolCalls;
  finalizeAnthropicToolCalls: typeof finalizeAnthropicToolCalls;
};

export type ChatRequestBody = ChatCompletionCreateParamsStreaming;
export type ChatFallbackRequestBody = ChatCompletionCreateParamsNonStreaming;
export type ResponsesRequestBody = ResponseCreateParamsStreaming;
export type ResponsesFallbackRequestBody = ResponseCreateParamsNonStreaming;

export type BaseApiStrategy<TStream, TResponse, TBody, TFallbackBody> = {
  buildStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => TBody;
  buildNonStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => TFallbackBody;
  stream: (
    stream: AsyncIterable<TStream>,
    handlers: StreamEventHandlers,
  ) => Promise<ToolCall[]>;
  extractToolCalls: (data: TResponse) => ToolCall[];
  extractReply: (data: TResponse) => string;
};

export type ChatApiStrategy = BaseApiStrategy<
  ChatCompletionChunk,
  ChatCompletion,
  ChatRequestBody,
  ChatFallbackRequestBody
>;

export type ResponsesApiStrategy = BaseApiStrategy<
  ResponseStreamEvent,
  Response,
  ResponsesRequestBody,
  ResponsesFallbackRequestBody
>;

export type MessagesApiStrategy = BaseApiStrategy<
  Anthropic.MessageStreamEvent,
  Anthropic.Message,
  Anthropic.MessageCreateParamsStreaming,
  Anthropic.MessageCreateParamsNonStreaming
>;

type ChatCollector = Parameters<ApiToolAdapter["addChatToolCallDelta"]>[0];
type ResponsesCollector = Parameters<
  ApiToolAdapter["addResponsesToolCallEvent"]
>[0];

type ApiStrategyMap = {
  chat: ChatApiStrategy;
  responses: ResponsesApiStrategy;
  messages: MessagesApiStrategy;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  readStringField = (source: unknown, field: string): string | null => {
    if (!isRecord(source)) {
      return null;
    }
    const value = source[field];
    if (typeof value !== "string") {
      return null;
    }
    return value;
  },
  ensureToolAdapter = (
    adapter: ApiToolAdapter | null | undefined,
  ): ApiToolAdapter => {
    if (!adapter) throw new Error("缺少工具适配器");
    return adapter;
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
    message: ReturnType<ApiToolAdapter["buildChatMessages"]>[number],
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
    item: ReturnType<ApiToolAdapter["buildResponsesInput"]>[number],
  ): ResponseInputItem => {
    if ("role" in item) {
      if (typeof item.content !== "string") {
        throw new Error(`${item.role} 消息缺少 content`);
      }
      return {
        role: item.role,
        content: item.content,
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
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    };
  },
  toChatExtractionPayload = (data: ChatCompletion) => {
    const firstChoice = data.choices.at(0);
    if (!firstChoice) return {};
    return { choices: [{ message: firstChoice.message }] };
  },
  toResponsesExtractionPayload = (data: Response) => {
    return { output: data.output };
  },
  extractChatReply = (data: ChatCompletion): string => {
    return data.choices.at(0)?.message.content?.trim() || "";
  },
  createApiStrategies = (toolAdapter: ApiToolAdapter): ApiStrategyMap => ({
    chat: {
      buildStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          messages: toolAdapter
            .buildChatMessages(systemPrompt, messages)
            .map(toChatMessageParam),
          model: settings.model,
          stream: true,
          tools: tools.map(toChatTool),
        }),
      buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          messages: toolAdapter
            .buildChatMessages(systemPrompt, messages)
            .map(toChatMessageParam),
          model: settings.model,
          stream: false,
          tools: tools.map(toChatTool),
        }),
      stream: async (stream, { onDelta, onChunk }) => {
        let collector: ChatCollector = {};
        for await (const chunk of stream) {
          const delta = getChatDeltaText(chunk),
            toolCallDeltas = getChatToolCallDeltas(chunk),
            toolCalls = getToolCallsFromChatDeltas(toolCallDeltas);
          if (delta !== "") onDelta(delta);
          if (toolCallDeltas.length > 0)
            collector = toolAdapter.addChatToolCallDelta(
              collector,
              toolCallDeltas,
            );
          onChunk({ delta, toolCalls });
        }
        return toolAdapter.finalizeChatToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractChatToolCalls(
          toChatExtractionPayload(data) as Parameters<
            ApiToolAdapter["extractChatToolCalls"]
          >[0],
        ),
      extractReply: (data) => extractChatReply(data),
    },
    responses: {
      buildStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          input: toolAdapter
            .buildResponsesInput(messages)
            .map(toResponsesInputItem),
          model: settings.model,
          stream: true,
          tools: tools.map(toResponsesTool),
          ...(systemPrompt ? { instructions: systemPrompt } : {}),
        }),
      buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          input: toolAdapter
            .buildResponsesInput(messages)
            .map(toResponsesInputItem),
          model: settings.model,
          stream: false,
          tools: tools.map(toResponsesTool),
          ...(systemPrompt ? { instructions: systemPrompt } : {}),
        }),
      stream: async (stream, { onDelta, onChunk }) => {
        let collector: ResponsesCollector = {};
        for await (const event of stream) {
          const payload = getResponsesToolCallEventPayload(event),
            delta = getResponsesDeltaText(event),
            toolCalls =
              payload === null
                ? []
                : getToolCallsFromResponsesEvent(payload, event.type);
          if (delta !== "") onDelta(delta);
          if (payload !== null)
            collector = toolAdapter.addResponsesToolCallEvent(
              collector,
              payload,
              event.type,
            );
          onChunk({ delta, toolCalls });
        }
        return toolAdapter.finalizeResponsesToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractResponsesToolCalls(
          toResponsesExtractionPayload(data) as Parameters<
            ApiToolAdapter["extractResponsesToolCalls"]
          >[0],
        ),
      extractReply: (data) => extractResponsesText(data),
    },
    messages: {
      buildStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          messages: toolAdapter.buildMessagesInput(
            messages,
          ) as Anthropic.MessageCreateParamsStreaming["messages"],
          model: settings.model,
          stream: true,
          tools: tools.map(toAnthropicTool),
          max_tokens: 64000,
          ...(systemPrompt ? { system: systemPrompt } : {}),
        }),
      buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) =>
        applySettingsRequestBodyOverrides(settings, {
          messages: toolAdapter.buildMessagesInput(
            messages,
          ) as Anthropic.MessageCreateParamsNonStreaming["messages"],
          model: settings.model,
          stream: false,
          tools: tools.map(toAnthropicTool),
          max_tokens: 64000,
          ...(systemPrompt ? { system: systemPrompt } : {}),
        }),
      stream: async (stream, { onDelta, onChunk }) => {
        let collector: AnthropicToolCallCollector = {};
        for await (const event of stream) {
          let delta = "";
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            delta = event.delta.text;
          }
          if (delta !== "") onDelta(delta);
          collector = toolAdapter.addAnthropicToolCallEvent(collector, event);
          onChunk({ delta, toolCalls: [] });
        }
        return toolAdapter.finalizeAnthropicToolCalls(collector);
      },
      extractToolCalls: (data) => toolAdapter.extractAnthropicToolCalls(data),
      extractReply: (data) => {
        return data.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("")
          .trim();
      },
    },
  });

export default function getApiStrategy(
  apiType: ApiType,
  toolAdapter: ApiToolAdapter,
): ChatApiStrategy | ResponsesApiStrategy | MessagesApiStrategy {
  const strategyMap = createApiStrategies(ensureToolAdapter(toolAdapter));
  switch (apiType) {
    case "chat":
      return strategyMap.chat;
    case "responses":
      return strategyMap.responses;
    case "messages":
      return strategyMap.messages;
    default: {
      throw new Error(`Unsupported API type: ${apiType as string}`);
    }
  }
}
