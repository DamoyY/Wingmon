import { ApiError, type GenerateContentParameters } from "@google/genai";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import {
  createAnthropicClient,
  createGeminiClient,
  createOpenAIClient,
} from "./clients.ts";
import {
  createEmptyStreamError,
  isAbortError,
  isEmptyStreamError,
  normalizeError,
  requestWithRetry,
} from "./request-utils.ts";
import getApiStrategy, {
  type ApiRequestChunk,
  type GeminiApiStrategy,
} from "./strategies.ts";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageRecord } from "../../shared/state/panelStateContext.ts";
import OpenAI from "openai";
import type { Settings } from "../services/index.ts";

export type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  messages: MessageRecord[];
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  onChunk: (chunk: ApiRequestChunk) => void;
  signal: AbortSignal;
};

export type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
};

const extractStatusCode = (error: unknown): number | null => {
  if (error instanceof OpenAI.APIError) {
    const { status } = error as { status?: unknown };
    return typeof status === "number" ? status : null;
  }
  if (error instanceof Anthropic.APIError) {
    const { status } = error as { status?: unknown };
    return typeof status === "number" ? status : null;
  }
  if (error instanceof ApiError) {
    return typeof error.status === "number" ? error.status : null;
  }
  return null;
};

const executeRequest = async <TStream, TResponse>(
  payload: RequestModelPayload,
  apiCall: (
    body: unknown,
    options: { signal: AbortSignal },
  ) => Promise<TStream | TResponse>,
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

  const streamRequestBody = strategy.buildStreamRequestBody(
    settings,
    systemPrompt,
    tools,
    messages,
  );
  let streamStarted = false;
  const streamState = { chunkCount: 0 };

  try {
    const stream = (await requestWithRetry({
      extractStatusCode,
      request: () => apiCall(streamRequestBody, { signal }),
      requestTag: `${requestTagPrefix}.stream`,
      signal,
    })) as TStream;

    onStreamStart();
    streamStarted = true;

    const toolCalls = await (
      strategy.stream as (
        s: TStream,
        h: {
          onDelta: (d: string) => void;
          onChunk: (c: ApiRequestChunk) => void;
        },
      ) => Promise<ToolCall[]>
    )(stream, {
      onChunk: (chunk) => {
        streamState.chunkCount += 1;
        onChunk(chunk);
      },
      onDelta,
    });

    if (streamState.chunkCount === 0) throw createEmptyStreamError();
    return { reply: "", streamed: true, toolCalls };
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (streamStarted && !isEmptyStreamError(error))
      throw normalizeError(error);
    console.warn(`${requestTagPrefix} 流式请求失败，准备回退为非流式`, {
      message: normalizeError(error).message,
    });
  }

  const nonStreamRequestBody = strategy.buildNonStreamRequestBody(
    settings,
    systemPrompt,
    tools,
    messages,
  );
  const response = (await requestWithRetry({
    extractStatusCode,
    request: () => apiCall(nonStreamRequestBody, { signal }),
    requestTag: `${requestTagPrefix}.non_stream`,
    signal,
  })) as TResponse;

  return {
    reply: (strategy.extractReply as (r: TResponse) => string)(response),
    streamed: false,
    toolCalls: (strategy.extractToolCalls as (r: TResponse) => ToolCall[])(
      response,
    ),
  };
};

const withGeminiAbortSignal = (
  body: GenerateContentParameters,
  signal: AbortSignal,
): GenerateContentParameters => ({
  ...body,
  config: {
    ...body.config,
    abortSignal: signal,
  },
});

const executeGeminiRequest = async (
  payload: RequestModelPayload,
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
    } = payload,
    strategy = getApiStrategy("gemini") as GeminiApiStrategy,
    client = createGeminiClient(settings),
    streamRequestBody = withGeminiAbortSignal(
      strategy.buildStreamRequestBody(settings, systemPrompt, tools, messages),
      signal,
    );
  let streamStarted = false;
  const streamState = { chunkCount: 0 };

  try {
    const stream = await requestWithRetry({
      extractStatusCode,
      request: () => client.models.generateContentStream(streamRequestBody),
      requestTag: "gemini.stream",
      signal,
    });

    onStreamStart();
    streamStarted = true;

    const toolCalls = await strategy.stream(stream, {
      onChunk: (chunk) => {
        streamState.chunkCount += 1;
        onChunk(chunk);
      },
      onDelta,
    });

    if (streamState.chunkCount === 0) {
      throw createEmptyStreamError();
    }
    return { reply: "", streamed: true, toolCalls };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (streamStarted && !isEmptyStreamError(error)) {
      throw normalizeError(error);
    }
    console.warn("gemini 流式请求失败，准备回退为非流式", {
      message: normalizeError(error).message,
    });
  }

  const nonStreamRequestBody = withGeminiAbortSignal(
      strategy.buildNonStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      ),
      signal,
    ),
    response = await requestWithRetry({
      extractStatusCode,
      request: () => client.models.generateContent(nonStreamRequestBody),
      requestTag: "gemini.non_stream",
      signal,
    });

  return {
    reply: strategy.extractReply(response),
    streamed: false,
    toolCalls: strategy.extractToolCalls(response),
  };
};

const requestModel = async (
  payload: RequestModelPayload,
): Promise<RequestModelResult> => {
  const { apiType } = payload.settings;

  if (apiType === "gemini") {
    return executeGeminiRequest(payload);
  }

  if (apiType === "messages") {
    const client = createAnthropicClient(payload.settings);
    return executeRequest<
      Anthropic.Messages.RawMessageStreamEvent,
      Anthropic.Messages.Message
    >(
      payload,
      (body, options) =>
        client.messages.create(
          body as Anthropic.Messages.MessageCreateParamsStreaming,
          options,
        ),
      "messages",
    );
  }

  const client = createOpenAIClient(payload.settings);
  if (apiType === "chat") {
    return executeRequest<
      AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
      OpenAI.Chat.Completions.ChatCompletion
    >(
      payload,
      (body, options) =>
        client.chat.completions.create(
          body as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
          options,
        ),
      "chat",
    );
  }

  return executeRequest<
    AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
    OpenAI.Responses.Response
  >(
    payload,
    (body, options) =>
      client.responses.create(
        body as OpenAI.Responses.ResponseCreateParamsStreaming,
        options,
      ),
    "responses",
  );
};

export default requestModel;
