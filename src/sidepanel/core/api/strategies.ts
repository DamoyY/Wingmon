import {
  extractResponsesText,
  streamChatCompletion,
  streamResponses,
  type ApiRequestChunk,
  type ResponsesToolCallEventPayload,
} from "./sse.ts";
import type { JsonValue } from "../../lib/utils/index.ts";
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

type ChatRequestBody = {
  model: string;
  messages: ReturnType<ApiToolAdapter["buildChatMessages"]>;
  stream: true;
  tools: ToolDefinition[];
};

type ResponsesRequestBody = {
  model: string;
  input: ReturnType<ApiToolAdapter["buildResponsesInput"]>;
  stream: true;
  tools: ToolDefinition[];
  instructions?: string;
};

export type ApiRequestBody = ChatRequestBody | ResponsesRequestBody;

type ApiStrategy = {
  buildRequestBody: (
    settings: Settings,
    systemPrompt: string,
    tools: ToolDefinition[],
    messages: MessageRecord[],
  ) => ApiRequestBody;
  stream: (
    response: Response,
    handlers: StreamEventHandlers,
  ) => Promise<ToolCall[]>;
  extractToolCalls: (data: JsonValue) => ToolCall[];
  extractReply: (data: JsonValue) => string;
};

type ChatCollector = Parameters<ApiToolAdapter["addChatToolCallDelta"]>[0];
type ChatDeltaList = Parameters<ApiToolAdapter["addChatToolCallDelta"]>[1];
type ResponsesCollector = Parameters<
  ApiToolAdapter["addResponsesToolCallEvent"]
>[0];
type ChatExtractionPayload = Parameters<
  ApiToolAdapter["extractChatToolCalls"]
>[0];
type ResponsesExtractionPayload = Parameters<
  ApiToolAdapter["extractResponsesToolCalls"]
>[0];
type ChatChoice = NonNullable<ChatExtractionPayload["choices"]>[number];
type ChatMessage = NonNullable<ChatChoice["message"]>;
type ChatFunctionCall = NonNullable<ChatMessage["function_call"]>;
type ChatToolCall = NonNullable<ChatMessage["tool_calls"]>[number];
type ResponsesOutputItem = NonNullable<
  ResponsesExtractionPayload["output"]
>[number];
type JsonObject = { [key: string]: JsonValue };

const isJsonObject = (value: JsonValue): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  toJsonObject = (value: JsonValue | undefined): JsonObject | null => {
    if (value === undefined) {
      return null;
    }
    return isJsonObject(value) ? value : null;
  },
  toJsonArray = (value: JsonValue | undefined): JsonValue[] | null => {
    if (value === undefined || !Array.isArray(value)) {
      return null;
    }
    return value;
  },
  toStringValue = (value: JsonValue | undefined): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    return value;
  },
  isPresent = <T>(value: T | null): value is T => value !== null,
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
  parseChatFunctionCall = (
    value: JsonValue | undefined,
  ): ChatFunctionCall | null => {
    const functionCallValue = toJsonObject(value);
    if (functionCallValue === null) {
      return null;
    }
    const functionCall: ChatFunctionCall = {},
      name = toStringValue(functionCallValue.name),
      argumentsText = toStringValue(functionCallValue.arguments);
    if (name !== null) {
      functionCall.name = name;
    }
    if (argumentsText !== null) {
      functionCall.arguments = argumentsText;
    }
    if (
      functionCall.name === undefined &&
      functionCall.arguments === undefined
    ) {
      return null;
    }
    return functionCall;
  },
  parseChatToolCall = (value: JsonValue): ChatToolCall | null => {
    const toolCallValue = toJsonObject(value);
    if (toolCallValue === null) {
      return null;
    }
    const toolCall: ChatToolCall = {},
      id = toStringValue(toolCallValue.id),
      callId = toStringValue(toolCallValue.call_id),
      functionCall = parseChatFunctionCall(toolCallValue.function);
    if (id !== null) {
      toolCall.id = id;
    }
    if (callId !== null) {
      toolCall.call_id = callId;
    }
    if (functionCall !== null) {
      toolCall.function = functionCall;
    }
    if (
      toolCall.id === undefined &&
      toolCall.call_id === undefined &&
      toolCall.function === undefined
    ) {
      return null;
    }
    return toolCall;
  },
  parseChatMessageForExtraction = (
    value: JsonValue | undefined,
  ): ChatMessage | null => {
    const messageValue = toJsonObject(value);
    if (messageValue === null) {
      return null;
    }
    const message: ChatMessage = {},
      id = toStringValue(messageValue.id),
      functionCall = parseChatFunctionCall(messageValue.function_call),
      toolCallsValue = toJsonArray(messageValue.tool_calls);
    if (id !== null) {
      message.id = id;
    }
    if (functionCall !== null) {
      message.function_call = functionCall;
    }
    if (toolCallsValue !== null) {
      const toolCalls = toolCallsValue.map(parseChatToolCall).filter(isPresent);
      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }
    }
    if (
      message.id === undefined &&
      message.tool_calls === undefined &&
      message.function_call === undefined
    ) {
      return null;
    }
    return message;
  },
  toChatExtractionPayload = (data: JsonValue): ChatExtractionPayload => {
    const payloadValue = toJsonObject(data);
    if (payloadValue === null) {
      return {};
    }
    const choicesValue = toJsonArray(payloadValue.choices);
    if (choicesValue === null) {
      return {};
    }
    const choices: ChatChoice[] = choicesValue
      .map((choiceValue) => {
        const choiceObject = toJsonObject(choiceValue);
        if (choiceObject === null) {
          return null;
        }
        const message = parseChatMessageForExtraction(choiceObject.message);
        if (message === null) {
          return null;
        }
        return { message };
      })
      .filter(isPresent);
    if (choices.length === 0) {
      return {};
    }
    return { choices };
  },
  parseResponsesOutputItem = (value: JsonValue): ResponsesOutputItem | null => {
    const itemValue = toJsonObject(value);
    if (itemValue === null) {
      return null;
    }
    const outputItem: ResponsesOutputItem = {},
      type = toStringValue(itemValue.type),
      id = toStringValue(itemValue.id),
      callId = toStringValue(itemValue.call_id),
      name = toStringValue(itemValue.name),
      argumentsText = toStringValue(itemValue.arguments);
    if (type !== null) {
      outputItem.type = type;
    }
    if (id !== null) {
      outputItem.id = id;
    }
    if (callId !== null) {
      outputItem.call_id = callId;
    }
    if (name !== null) {
      outputItem.name = name;
    }
    if (argumentsText !== null) {
      outputItem.arguments = argumentsText;
    }
    if (
      outputItem.type === undefined &&
      outputItem.id === undefined &&
      outputItem.call_id === undefined &&
      outputItem.name === undefined &&
      outputItem.arguments === undefined
    ) {
      return null;
    }
    return outputItem;
  },
  toResponsesExtractionPayload = (
    data: JsonValue,
  ): ResponsesExtractionPayload => {
    const payloadValue = toJsonObject(data);
    if (payloadValue === null) {
      return {};
    }
    const outputValue = toJsonArray(payloadValue.output);
    if (outputValue === null) {
      return {};
    }
    const output = outputValue.map(parseResponsesOutputItem).filter(isPresent);
    if (output.length === 0) {
      return {};
    }
    return { output };
  },
  extractChatReply = (data: JsonValue): string => {
    const payloadValue = toJsonObject(data);
    if (payloadValue === null) {
      return "";
    }
    const choicesValue = toJsonArray(payloadValue.choices);
    if (choicesValue === null || choicesValue.length === 0) {
      return "";
    }
    const choiceValue = toJsonObject(choicesValue[0]);
    if (choiceValue === null) {
      return "";
    }
    const messageValue = toJsonObject(choiceValue.message);
    if (messageValue === null) {
      return "";
    }
    const content = toStringValue(messageValue.content);
    if (content === null) {
      return "";
    }
    return content.trim();
  },
  createApiStrategies = (
    toolAdapter: ApiToolAdapter,
  ): Record<ApiType, ApiStrategy> => ({
    chat: {
      buildRequestBody: (settings, systemPrompt, tools, messages) => ({
        model: settings.model,
        messages: toolAdapter.buildChatMessages(systemPrompt, messages),
        stream: true,
        tools,
      }),
      stream: async (response, { onDelta, onChunk }) => {
        let collector: ChatCollector = {};
        await streamChatCompletion(response, {
          onDelta,
          onChunk,
          onToolCallDelta: (deltas: ChatDeltaList) => {
            collector = toolAdapter.addChatToolCallDelta(collector, deltas);
          },
        });
        return toolAdapter.finalizeChatToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractChatToolCalls(toChatExtractionPayload(data)),
      extractReply: (data) => extractChatReply(data),
    },
    responses: {
      buildRequestBody: (settings, systemPrompt, tools, messages) => {
        const requestBody: ResponsesRequestBody = {
          model: settings.model,
          input: toolAdapter.buildResponsesInput(messages),
          stream: true,
          tools,
        };
        if (systemPrompt) {
          requestBody.instructions = systemPrompt;
        }
        return requestBody;
      },
      stream: async (response, { onDelta, onChunk }) => {
        let collector: ResponsesCollector = {};
        await streamResponses(response, {
          onDelta,
          onChunk,
          onToolCallEvent: (
            payload: ResponsesToolCallEventPayload,
            eventType: string,
          ) => {
            collector = toolAdapter.addResponsesToolCallEvent(
              collector,
              payload,
              eventType,
            );
          },
        });
        return toolAdapter.finalizeResponsesToolCalls(collector);
      },
      extractToolCalls: (data) =>
        toolAdapter.extractResponsesToolCalls(
          toResponsesExtractionPayload(data),
        ),
      extractReply: (data) => extractResponsesText(data),
    },
  }),
  getApiStrategy = (
    apiType: ApiType,
    toolAdapter: ApiToolAdapter,
  ): ApiStrategy =>
    createApiStrategies(ensureToolAdapter(toolAdapter))[apiType];

export default getApiStrategy;
