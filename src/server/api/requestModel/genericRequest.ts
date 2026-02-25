import type Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ToolCall } from "../../agent/definitions.ts";
import getApiStrategy, { type ApiRequestChunk } from "../strategies.ts";
import type { RequestModelPayload, RequestModelResult } from "./types.ts";
import { executeStreamFallbackRequest } from "./streamFallback.ts";

type GenericApiCall<TStream, TResponse> = (
  body: unknown,
  options: { signal: AbortSignal },
) => Promise<TStream | TResponse>;

type StreamConsumer<TStream> = (
  stream: TStream,
  handlers: {
    onDelta: (delta: string) => void;
    onChunk: (chunk: ApiRequestChunk) => void;
  },
) => Promise<ToolCall[]>;

const asStreamConsumer = <TStream>(stream: unknown): StreamConsumer<TStream> =>
  stream as StreamConsumer<TStream>;

export const executeRequest = async <TStream, TResponse>(
  payload: RequestModelPayload,
  apiCall: GenericApiCall<TStream, TResponse>,
  requestTagPrefix: string,
): Promise<RequestModelResult> => {
  const {
    settings,
    systemPrompt,
    tools,
    messages,
    onDelta,
    onStreamStart,
    onChunk,
    signal,
  } = payload;
  const strategy = getApiStrategy(settings.apiType);

  return executeStreamFallbackRequest<TStream, TResponse, unknown, unknown>({
    buildNonStreamRequestBody: () =>
      strategy.buildNonStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      ),
    buildStreamRequestBody: () =>
      strategy.buildStreamRequestBody(settings, systemPrompt, tools, messages),
    consumeStream: (stream, handlers) =>
      asStreamConsumer<TStream>(strategy.stream)(stream, handlers),
    extractReply: (response) =>
      (strategy.extractReply as (value: TResponse) => string)(response),
    extractToolCalls: (response) =>
      (strategy.extractToolCalls as (value: TResponse) => ToolCall[])(response),
    onChunk,
    onDelta,
    onStreamStart,
    requestNonStream: (body) => apiCall(body, { signal }) as Promise<TResponse>,
    requestStream: (body) => apiCall(body, { signal }) as Promise<TStream>,
    requestTagPrefix,
    signal,
  });
};

export type ChatStream =
  AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
export type ChatResponse = OpenAI.Chat.Completions.ChatCompletion;
export type ResponsesStream =
  AsyncIterable<OpenAI.Responses.ResponseStreamEvent>;
export type ResponsesResponse = OpenAI.Responses.Response;
export type MessagesStream = Anthropic.Messages.RawMessageStreamEvent;
export type MessagesResponse = Anthropic.Messages.Message;
