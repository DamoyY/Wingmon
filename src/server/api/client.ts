import { ApiError, type GenerateContentParameters } from "@google/genai";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import {
  buildCodexResponsesHeaders,
  extractCodexAuthProfile,
  getCodexTokens,
} from "../../shared/index.ts";
import {
  createAnthropicClient,
  createGeminiClient,
  createOpenAIClient,
  normalizeClientBaseUrl,
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

type StreamRetryTracker = {
  chunkCount: number;
  streamStarted: boolean;
};

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractNumericStatus = (value: unknown): number | null => {
  if (!isObjectRecord(value)) {
    return null;
  }
  const status = value.status;
  return typeof status === "number" ? status : null;
};

const extractStatusCode = (error: unknown): number | null => {
  if (error instanceof HttpStatusError) {
    return error.status;
  }
  if (error instanceof OpenAI.APIError) {
    return extractNumericStatus(error);
  }
  if (error instanceof Anthropic.APIError) {
    return extractNumericStatus(error);
  }
  if (error instanceof ApiError) {
    return typeof error.status === "number" ? error.status : null;
  }
  return null;
};

const codexResponsesPath = "/responses";

const withCodexRequestDefaults = (body: object): Record<string, unknown> => ({
  ...body,
  store: false,
});

const resolveCodexHeaders = async ({
  accept,
  accessToken,
}: {
  accept: string;
  accessToken: string;
}): Promise<Record<string, string>> => {
  const codexHeaders = buildCodexResponsesHeaders(),
    savedTokens = await getCodexTokens();
  if (savedTokens !== null && savedTokens.access_token === accessToken) {
    const profile = extractCodexAuthProfile(savedTokens);
    if (profile.chatgptAccountId.trim()) {
      codexHeaders["chatgpt-account-id"] = profile.chatgptAccountId.trim();
    }
  }
  return {
    Accept: accept,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...codexHeaders,
  };
};

const readResponseText = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch (error) {
    console.error("读取响应文本失败", error);
    throw new Error("读取响应文本失败");
  }
};

const parseJsonText = (jsonText: string): unknown => {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("响应 JSON 解析失败", error);
    throw new Error("响应 JSON 解析失败");
  }
};

const parseCodexResponse = (jsonText: string): OpenAI.Responses.Response => {
  const parsed = parseJsonText(jsonText);
  if (!isObjectRecord(parsed)) {
    throw new Error("Codex 非流式响应格式无效");
  }
  return parsed as OpenAI.Responses.Response;
};

const parseCodexStreamEvent = (
  payload: string,
): OpenAI.Responses.ResponseStreamEvent => {
  const parsed = parseJsonText(payload);
  if (!isObjectRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error("Codex SSE 事件格式无效");
  }
  return parsed as OpenAI.Responses.ResponseStreamEvent;
};

const postCodexResponses = async ({
  accessToken,
  accept,
  baseUrl,
  body,
  signal,
}: {
  accessToken: string;
  accept: string;
  baseUrl: string;
  body: object;
  signal: AbortSignal;
}): Promise<Response> => {
  const response = await fetch(
    `${normalizeClientBaseUrl(baseUrl)}${codexResponsesPath}`,
    {
      body: JSON.stringify(withCodexRequestDefaults(body)),
      headers: await resolveCodexHeaders({ accessToken, accept }),
      method: "POST",
      signal,
    },
  );
  if (response.ok) {
    return response;
  }
  const errorBody = await readResponseText(response);
  const normalizedBody = errorBody.trim() || "no body";
  throw new HttpStatusError(
    response.status,
    `${String(response.status)} status code (${normalizedBody})`,
  );
};

const extractSsePayload = (block: string): string => {
  const payloadLines: string[] = [];
  block.split(/\r?\n/gu).forEach((line) => {
    if (line.startsWith("data:")) {
      payloadLines.push(line.slice(5).trim());
    }
  });
  return payloadLines.join("\n");
};

const parseSseEvent = (
  payload: string,
): OpenAI.Responses.ResponseStreamEvent => {
  try {
    return parseCodexStreamEvent(payload);
  } catch (error: unknown) {
    console.error("Codex SSE 事件解析失败", { error, payload });
    throw new Error("Codex SSE 事件解析失败");
  }
};

const findSseBoundary = (
  text: string,
): { index: number; length: number } | null => {
  const crlfBoundaryIndex = text.indexOf("\r\n\r\n");
  const lfBoundaryIndex = text.indexOf("\n\n");
  if (crlfBoundaryIndex < 0 && lfBoundaryIndex < 0) {
    return null;
  }
  if (
    crlfBoundaryIndex >= 0 &&
    (lfBoundaryIndex < 0 || crlfBoundaryIndex < lfBoundaryIndex)
  ) {
    return { index: crlfBoundaryIndex, length: "\r\n\r\n".length };
  }
  return { index: lfBoundaryIndex, length: "\n\n".length };
};

const consumeSseBuffer = (
  buffer: string,
): { events: OpenAI.Responses.ResponseStreamEvent[]; rest: string } => {
  const events: OpenAI.Responses.ResponseStreamEvent[] = [];
  let rest = buffer;
  for (;;) {
    const boundary = findSseBoundary(rest);
    if (boundary === null) {
      break;
    }
    const block = rest.slice(0, boundary.index);
    rest = rest.slice(boundary.index + boundary.length);
    const payload = extractSsePayload(block);
    if (!payload || payload === "[DONE]") {
      continue;
    }
    events.push(parseSseEvent(payload));
  }
  return { events, rest };
};

const iterateCodexSseEvents = async function* ({
  response,
}: {
  response: Response;
}): AsyncIterable<OpenAI.Responses.ResponseStreamEvent> {
  if (response.body === null) {
    throw new Error("Codex 流式响应为空");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    buffer += decoder.decode(chunk.value, { stream: true });
    const consumed = consumeSseBuffer(buffer);
    buffer = consumed.rest;
    for (const event of consumed.events) {
      yield event;
    }
  }
  const tail = buffer.trim();
  if (!tail) {
    return;
  }
  const payload = extractSsePayload(tail);
  if (!payload || payload === "[DONE]") {
    return;
  }
  yield parseSseEvent(payload);
};

const logStreamFallback = ({
  chunkCount,
  error,
  requestTag,
  streamStarted,
}: {
  chunkCount: number;
  error: unknown;
  requestTag: string;
  streamStarted: boolean;
}): void => {
  const failure = normalizeError(error),
    logPayload = { chunkCount, message: failure.message, streamStarted };
  if (streamStarted && chunkCount > 0 && !isEmptyStreamError(error)) {
    console.warn(`${requestTag} 流式连接中断，改用非流式补全回复`, logPayload);
    return;
  }
  console.warn(`${requestTag} 流式请求失败，回退为非流式`, logPayload);
};

const executeStreamWithRetry = async <TStream>({
  consumeStream,
  extractStatusCode,
  onChunk,
  onDelta,
  onStreamStart,
  requestStream,
  requestTag,
  signal,
  tracker,
}: {
  consumeStream: (
    stream: TStream,
    handlers: {
      onDelta: (delta: string) => void;
      onChunk: (chunk: ApiRequestChunk) => void;
    },
  ) => Promise<ToolCall[]>;
  extractStatusCode: (error: unknown) => number | null;
  onChunk: (chunk: ApiRequestChunk) => void;
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  requestStream: () => Promise<TStream>;
  requestTag: string;
  signal: AbortSignal;
  tracker: StreamRetryTracker;
}): Promise<ToolCall[]> =>
  requestWithRetry({
    extractStatusCode,
    request: async () => {
      const stream = await requestStream();
      if (!tracker.streamStarted) {
        onStreamStart();
        tracker.streamStarted = true;
      }
      let attemptChunkCount = 0;
      const toolCalls = await consumeStream(stream, {
        onChunk: (chunk) => {
          attemptChunkCount += 1;
          tracker.chunkCount += 1;
          onChunk(chunk);
        },
        onDelta,
      });
      if (attemptChunkCount === 0) {
        throw createEmptyStreamError();
      }
      return toolCalls;
    },
    requestTag,
    signal,
  });

const codexResponsesApiCall = async (
  settings: Settings,
  body: unknown,
  signal: AbortSignal,
): Promise<
  | AsyncIterable<OpenAI.Responses.ResponseStreamEvent>
  | OpenAI.Responses.Response
> => {
  if (!isObjectRecord(body)) {
    throw new Error("Codex 请求体格式无效");
  }
  const isStream = body.stream === true;
  const response = await postCodexResponses({
    accept: isStream ? "text/event-stream" : "application/json",
    accessToken: settings.apiKey,
    baseUrl: settings.baseUrl,
    body,
    signal,
  });
  if (isStream) {
    return iterateCodexSseEvents({ response });
  }
  const responseText = await readResponseText(response);
  if (!responseText.trim()) {
    throw new Error("Codex 非流式响应为空");
  }
  return parseCodexResponse(responseText);
};

type StreamFallbackExecution<
  TStream,
  TResponse,
  TStreamRequestBody,
  TNonStreamRequestBody,
> = {
  buildNonStreamRequestBody: () => TNonStreamRequestBody;
  buildStreamRequestBody: () => TStreamRequestBody;
  consumeStream: (
    stream: TStream,
    handlers: {
      onDelta: (delta: string) => void;
      onChunk: (chunk: ApiRequestChunk) => void;
    },
  ) => Promise<ToolCall[]>;
  extractReply: (response: TResponse) => string;
  extractToolCalls: (response: TResponse) => ToolCall[];
  onChunk: (chunk: ApiRequestChunk) => void;
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  requestNonStream: (body: TNonStreamRequestBody) => Promise<TResponse>;
  requestStream: (body: TStreamRequestBody) => Promise<TStream>;
  requestTagPrefix: string;
  signal: AbortSignal;
};

const executeStreamFallbackRequest = async <
  TStream,
  TResponse,
  TStreamRequestBody,
  TNonStreamRequestBody,
>({
  buildNonStreamRequestBody,
  buildStreamRequestBody,
  consumeStream,
  extractReply,
  extractToolCalls,
  onChunk,
  onDelta,
  onStreamStart,
  requestNonStream,
  requestStream,
  requestTagPrefix,
  signal,
}: StreamFallbackExecution<
  TStream,
  TResponse,
  TStreamRequestBody,
  TNonStreamRequestBody
>): Promise<RequestModelResult> => {
  const streamRequestBody = buildStreamRequestBody();
  const streamTracker: StreamRetryTracker = {
    chunkCount: 0,
    streamStarted: false,
  };

  try {
    const toolCalls = await executeStreamWithRetry<TStream>({
      consumeStream,
      extractStatusCode,
      onChunk,
      onDelta,
      onStreamStart,
      requestStream: () => requestStream(streamRequestBody),
      requestTag: `${requestTagPrefix}.stream`,
      signal,
      tracker: streamTracker,
    });
    return { reply: "", streamed: true, toolCalls };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    logStreamFallback({
      chunkCount: streamTracker.chunkCount,
      error,
      requestTag: requestTagPrefix,
      streamStarted: streamTracker.streamStarted,
    });
  }

  const nonStreamRequestBody = buildNonStreamRequestBody();
  const response = await requestWithRetry({
    extractStatusCode,
    request: () => requestNonStream(nonStreamRequestBody),
    requestTag: `${requestTagPrefix}.non_stream`,
    signal,
  });

  return {
    reply: extractReply(response),
    streamed: false,
    toolCalls: extractToolCalls(response),
  };
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
      (
        strategy.stream as (
          s: TStream,
          h: {
            onDelta: (d: string) => void;
            onChunk: (c: ApiRequestChunk) => void;
          },
        ) => Promise<ToolCall[]>
      )(stream, handlers),
    extractReply: (response) =>
      (strategy.extractReply as (r: TResponse) => string)(response),
    extractToolCalls: (response) =>
      (strategy.extractToolCalls as (r: TResponse) => ToolCall[])(response),
    onChunk,
    onDelta,
    onStreamStart,
    requestNonStream: (body) => apiCall(body, { signal }) as Promise<TResponse>,
    requestStream: (body) => apiCall(body, { signal }) as Promise<TStream>,
    requestTagPrefix,
    signal,
  });
};

const withGeminiAbortSignal = (
  body: GenerateContentParameters,
  signal: AbortSignal,
): GenerateContentParameters => ({
  ...body,
  config: { ...body.config, abortSignal: signal },
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
    client = createGeminiClient(settings);

  return executeStreamFallbackRequest<
    Awaited<ReturnType<typeof client.models.generateContentStream>>,
    Awaited<ReturnType<typeof client.models.generateContent>>,
    GenerateContentParameters,
    GenerateContentParameters
  >({
    buildNonStreamRequestBody: () =>
      withGeminiAbortSignal(
        strategy.buildNonStreamRequestBody(
          settings,
          systemPrompt,
          tools,
          messages,
        ),
        signal,
      ),
    buildStreamRequestBody: () =>
      withGeminiAbortSignal(
        strategy.buildStreamRequestBody(
          settings,
          systemPrompt,
          tools,
          messages,
        ),
        signal,
      ),
    consumeStream: (stream, handlers) => strategy.stream(stream, handlers),
    extractReply: (response) => strategy.extractReply(response),
    extractToolCalls: (response) => strategy.extractToolCalls(response),
    onChunk,
    onDelta,
    onStreamStart,
    requestNonStream: (body) => client.models.generateContent(body),
    requestStream: (body) => client.models.generateContentStream(body),
    requestTagPrefix: "gemini",
    signal,
  });
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

  if (apiType === "codex") {
    return executeRequest<
      AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
      OpenAI.Responses.Response
    >(
      payload,
      (body, options) =>
        codexResponsesApiCall(payload.settings, body, options.signal),
      "codex.responses",
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
