import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import type Anthropic from "@anthropic-ai/sdk";
import type { ApiRequestChunk } from "./sse.ts";
import type { MessageRecord } from "../store/index.ts";
import type { Settings } from "../services/index.ts";

export type StreamEventHandlers = {
  onDelta: (delta: string) => void;
  onChunk: (chunk: ApiRequestChunk) => void;
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

export type ApiStrategyMap = {
  chat: ChatApiStrategy;
  responses: ResponsesApiStrategy;
  messages: MessagesApiStrategy;
};

export type ApiStrategy =
  | ChatApiStrategy
  | ResponsesApiStrategy
  | MessagesApiStrategy;
