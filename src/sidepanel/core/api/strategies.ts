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
  ResponseOutputItem,
  ResponseStreamEvent,
  Tool as ResponsesTool,
} from "openai/resources/responses/responses";
import {
  extractResponsesText,
  getChatDeltaText,
  getChatToolCallDeltas,
  getResponsesDeltaText,
  getResponsesToolCallEventPayload,
  getToolCallsFromChatDeltas,
  getToolCallsFromResponsesEvent,
  type ApiRequestChunk,
} from "./sse.ts";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import type {
  buildChatMessages,
  buildResponsesInput,
} from "../agent/message-builders.ts";
import type {
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
} from "../agent/toolCallNormalization.ts";
import type { MessageRecord } from "../store/index.ts";
import type { ApiType, Settings } from "../services/index.ts";

export type { ApiRequestChunk } from "./sse.ts";

type StreamEventHandlers = {
  onDelta: (delta: string) => void;
  onChunk: (chunk: ApiRequestChunk) => void;
};

export type ApiToolAdapter = {
  addChatToolCallDelta: typeof addChatToolCallDelta;
  addResponsesToolCallEvent: typeof addResponsesToolCallEvent;
  buildChatMessages: typeof buildChatMessages;
  buildResponsesInput: typeof buildResponsesInput;
  extractChatToolCalls: typeof extractChatToolCalls;
  extractResponsesToolCalls: typeof extractResponsesToolCalls;
  finalizeChatToolCalls: typeof finalizeChatToolCalls;
  finalizeResponsesToolCalls: typeof finalizeResponsesToolCalls;
};

export type ChatRequestBody = ChatCompletionCreateParamsStreaming;
export type ChatFallbackRequestBody = ChatCompletionCreateParamsNonStreaming;
export type ResponsesRequestBody = ResponseCreateParamsStreaming;
export type ResponsesFallbackRequestBody = ResponseCreateParamsNonStreaming;

export type ChatApiStrategy = {
  buildStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => ChatRequestBody;
  buildNonStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => ChatFallbackRequestBody;
  stream: (
    stream: AsyncIterable<ChatCompletionChunk>,
    handlers: StreamEventHandlers,
  ) => Promise<ToolCall[]>;
  extractToolCalls: (data: ChatCompletion) => ToolCall[];
  extractReply: (data: ChatCompletion) => string;
};

export type ResponsesApiStrategy = {
  buildStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => ResponsesRequestBody;
  buildNonStreamRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => ResponsesFallbackRequestBody;
  stream: (
    stream: AsyncIterable<ResponseStreamEvent>,
    handlers: StreamEventHandlers,
  ) => Promise<ToolCall[]>;
  extractToolCalls: (data: Response) => ToolCall[];
  extractReply: (data: Response) => string;
};

type ChatCollector = Parameters<ApiToolAdapter["addChatToolCallDelta"]>[0];
type ChatDeltaList = Parameters<ApiToolAdapter["addChatToolCallDelta"]>[1];
type ResponsesCollector = Parameters<
  ApiToolAdapter["addResponsesToolCallEvent"]
>[0];
type ChatExtractionPayload = Parameters<
  ApiToolAdapter["extractChatToolCalls"]
>[0];
type ChatChoiceForExtraction = NonNullable<
  ChatExtractionPayload["choices"]
>[number];
type ChatMessageForExtraction = NonNullable<ChatChoiceForExtraction["message"]>;
type ChatFunctionCallForExtraction = NonNullable<
  ChatMessageForExtraction["function_call"]
>;
type ChatToolCallForExtraction = NonNullable<
  ChatMessageForExtraction["tool_calls"]
>[number];
type ResponsesExtractionPayload = Parameters<
  ApiToolAdapter["extractResponsesToolCalls"]
>[0];
type ResponsesOutputItemForExtraction = NonNullable<
  ResponsesExtractionPayload["output"]
>[number];
type RawChatMessage = ReturnType<ApiToolAdapter["buildChatMessages"]>[number];
type RawResponsesInputItem = ReturnType<
  ApiToolAdapter["buildResponsesInput"]
>[number];

type ApiStrategyMap = {
  chat: ChatApiStrategy;
  responses: ResponsesApiStrategy;
};

const isPresent = <T>(value: T | null): value is T => value !== null,
  isRecord = (value: unknown): value is Record<string, unknown> =>
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
    if (adapter === null || adapter === undefined) {
      throw new Error("缺少工具适配器");
    }
    if (typeof adapter.addChatToolCallDelta !== "function") {
      throw new Error("工具适配器缺少方法：addChatToolCallDelta");
    }
    if (typeof adapter.addResponsesToolCallEvent !== "function") {
      throw new Error("工具适配器缺少方法：addResponsesToolCallEvent");
    }
    if (typeof adapter.buildChatMessages !== "function") {
      throw new Error("工具适配器缺少方法：buildChatMessages");
    }
    if (typeof adapter.buildResponsesInput !== "function") {
      throw new Error("工具适配器缺少方法：buildResponsesInput");
    }
    if (typeof adapter.extractChatToolCalls !== "function") {
      throw new Error("工具适配器缺少方法：extractChatToolCalls");
    }
    if (typeof adapter.extractResponsesToolCalls !== "function") {
      throw new Error("工具适配器缺少方法：extractResponsesToolCalls");
    }
    if (typeof adapter.finalizeChatToolCalls !== "function") {
      throw new Error("工具适配器缺少方法：finalizeChatToolCalls");
    }
    if (typeof adapter.finalizeResponsesToolCalls !== "function") {
      throw new Error("工具适配器缺少方法：finalizeResponsesToolCalls");
    }
    return adapter;
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
      id: idValue,
      type: "function",
      function: {
        name: functionValue.name,
        arguments: normalizeToolArguments(functionValue.arguments),
      },
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
    message: RawChatMessage,
  ): ChatCompletionMessageParam => {
    const role = message.role;
    if (role === "system" || role === "developer" || role === "user") {
      if (typeof message.content !== "string") {
        throw new Error(`${role} 消息缺少 content`);
      }
      return { role, content: message.content };
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
        role: "tool",
        content: message.content,
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
  toResponsesInputItem = (item: RawResponsesInputItem): ResponseInputItem => {
    if ("role" in item) {
      if (typeof item.content !== "string") {
        throw new Error(`${item.role} 消息缺少 content`);
      }
      return { role: item.role, content: item.content };
    }
    if (item.type === "function_call") {
      return {
        type: "function_call",
        call_id: item.call_id,
        name: item.name,
        arguments: normalizeToolArguments(item.arguments),
      };
    }
    return {
      type: "function_call_output",
      call_id: item.call_id,
      output: item.output,
    };
  },
  toChatTool = (tool: ToolDefinition): ChatCompletionTool => {
    if ("function" in tool) {
      return {
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
          strict: tool.function.strict,
        },
      };
    }
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: tool.strict,
      },
    };
  },
  toResponsesTool = (tool: ToolDefinition): ResponsesTool => {
    if ("function" in tool) {
      return {
        type: "function",
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
        strict: tool.function.strict,
      };
    }
    return {
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: tool.strict,
    };
  },
  toChatToolCallForExtraction = (
    toolCall: ChatCompletionMessageToolCall,
  ): ChatToolCallForExtraction | null => {
    if (toolCall.type !== "function") {
      return null;
    }
    const parsed: ChatToolCallForExtraction = {};
    if (typeof toolCall.id === "string" && toolCall.id.length > 0) {
      parsed.id = toolCall.id;
      parsed.call_id = toolCall.id;
    }
    const parsedFunction: NonNullable<ChatToolCallForExtraction["function"]> =
      {};
    if (
      typeof toolCall.function.name === "string" &&
      toolCall.function.name.length > 0
    ) {
      parsedFunction.name = toolCall.function.name;
    }
    if (typeof toolCall.function.arguments === "string") {
      parsedFunction.arguments = toolCall.function.arguments;
    }
    if (
      parsedFunction.name !== undefined ||
      parsedFunction.arguments !== undefined
    ) {
      parsed.function = parsedFunction;
    }
    if (
      parsed.id === undefined &&
      parsed.call_id === undefined &&
      parsed.function === undefined
    ) {
      return null;
    }
    return parsed;
  },
  toChatFunctionCallForExtraction = (
    value: unknown,
  ): ChatFunctionCallForExtraction | null => {
    if (!isRecord(value)) {
      return null;
    }
    const name = readStringField(value, "name");
    if (name === null || name.length === 0) {
      return null;
    }
    const functionPayload: ChatFunctionCallForExtraction = { name },
      argumentsText = readStringField(value, "arguments");
    if (argumentsText !== null) {
      functionPayload.arguments = argumentsText;
    }
    return functionPayload;
  },
  toChatExtractionPayload = (data: ChatCompletion): ChatExtractionPayload => {
    const firstChoice = data.choices.at(0);
    if (firstChoice === undefined) {
      return {};
    }
    const toolCalls = Array.isArray(firstChoice.message.tool_calls)
      ? firstChoice.message.tool_calls
          .map(toChatToolCallForExtraction)
          .filter(isPresent)
      : [];
    if (toolCalls.length === 0) {
      const rawMessage = firstChoice.message as unknown,
        functionPayload = toChatFunctionCallForExtraction(
          isRecord(rawMessage) ? rawMessage.function_call : null,
        );
      if (functionPayload !== null) {
        const message: ChatMessageForExtraction = {
          function_call: functionPayload,
        };
        if (typeof data.id === "string" && data.id.length > 0) {
          message.id = data.id;
        } else {
          message.id = functionPayload.name;
        }
        return {
          choices: [{ message }],
        };
      }
      return {};
    }
    return {
      choices: [{ message: { tool_calls: toolCalls } }],
    };
  },
  isFunctionCallOutputItem = (
    item: ResponseOutputItem,
  ): item is Extract<ResponseOutputItem, { type: "function_call" }> =>
    item.type === "function_call",
  toResponsesOutputItemForExtraction = (
    item: ResponseOutputItem,
  ): ResponsesOutputItemForExtraction | null => {
    if (!isFunctionCallOutputItem(item)) {
      return null;
    }
    const outputItem: ResponsesOutputItemForExtraction = {
      type: "function_call",
      call_id: item.call_id,
      name: item.name,
      arguments: item.arguments,
    };
    if (typeof item.id === "string" && item.id.length > 0) {
      outputItem.id = item.id;
    }
    return outputItem;
  },
  toResponsesExtractionPayload = (
    data: Response,
  ): ResponsesExtractionPayload => {
    const output = data.output
      .map(toResponsesOutputItemForExtraction)
      .filter(isPresent);
    if (output.length === 0) {
      return {};
    }
    return { output };
  },
  extractChatReply = (data: ChatCompletion): string => {
    const firstChoice = data.choices.at(0);
    if (
      firstChoice === undefined ||
      typeof firstChoice.message.content !== "string"
    ) {
      return "";
    }
    return firstChoice.message.content.trim();
  },
  createApiStrategies = (toolAdapter: ApiToolAdapter): ApiStrategyMap => ({
    chat: {
      buildStreamRequestBody: (settings, systemPrompt, tools, messages) => ({
        model: settings.model,
        messages: toolAdapter
          .buildChatMessages(systemPrompt, messages)
          .map(toChatMessageParam),
        stream: true,
        tools: tools.map(toChatTool),
      }),
      buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) => ({
        model: settings.model,
        messages: toolAdapter
          .buildChatMessages(systemPrompt, messages)
          .map(toChatMessageParam),
        stream: false,
        tools: tools.map(toChatTool),
      }),
      stream: async (stream, { onDelta, onChunk }) => {
        let collector: ChatCollector = {};
        for await (const chunk of stream) {
          const delta = getChatDeltaText(chunk),
            toolCallDeltas: ChatDeltaList = getChatToolCallDeltas(chunk),
            toolCalls = getToolCallsFromChatDeltas(toolCallDeltas);
          if (delta.length > 0) {
            onDelta(delta);
          }
          if (toolCallDeltas.length > 0) {
            collector = toolAdapter.addChatToolCallDelta(
              collector,
              toolCallDeltas,
            );
          }
          onChunk({ delta, toolCalls });
        }
        return toolAdapter.finalizeChatToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractChatToolCalls(toChatExtractionPayload(data)),
      extractReply: (data) => extractChatReply(data),
    },
    responses: {
      buildStreamRequestBody: (settings, systemPrompt, tools, messages) => {
        const body: ResponsesRequestBody = {
          model: settings.model,
          input: toolAdapter
            .buildResponsesInput(messages)
            .map(toResponsesInputItem),
          stream: true,
          tools: tools.map(toResponsesTool),
        };
        if (systemPrompt) {
          body.instructions = systemPrompt;
        }
        return body;
      },
      buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) => {
        const body: ResponsesFallbackRequestBody = {
          model: settings.model,
          input: toolAdapter
            .buildResponsesInput(messages)
            .map(toResponsesInputItem),
          stream: false,
          tools: tools.map(toResponsesTool),
        };
        if (systemPrompt) {
          body.instructions = systemPrompt;
        }
        return body;
      },
      stream: async (stream, { onDelta, onChunk }) => {
        let collector: ResponsesCollector = {};
        for await (const event of stream) {
          const payload = getResponsesToolCallEventPayload(event),
            delta = getResponsesDeltaText(event),
            toolCalls =
              payload === null
                ? []
                : getToolCallsFromResponsesEvent(payload, event.type);
          if (delta.length > 0) {
            onDelta(delta);
          }
          if (payload !== null) {
            collector = toolAdapter.addResponsesToolCallEvent(
              collector,
              payload,
              event.type,
            );
          }
          onChunk({ delta, toolCalls });
        }
        return toolAdapter.finalizeResponsesToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractResponsesToolCalls(
          toResponsesExtractionPayload(data),
        ),
      extractReply: (data) => extractResponsesText(data),
    },
  });

function getApiStrategy(
  apiType: "chat",
  toolAdapter: ApiToolAdapter,
): ChatApiStrategy;
function getApiStrategy(
  apiType: "responses",
  toolAdapter: ApiToolAdapter,
): ResponsesApiStrategy;
function getApiStrategy(
  apiType: ApiType,
  toolAdapter: ApiToolAdapter,
): ChatApiStrategy | ResponsesApiStrategy {
  return createApiStrategies(ensureToolAdapter(toolAdapter))[apiType];
}

export default getApiStrategy;
