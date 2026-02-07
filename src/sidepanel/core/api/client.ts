import OpenAI from "openai";
import getApiStrategy, {
  type ApiRequestChunk,
  type ApiToolAdapter,
} from "./strategies.ts";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import type { MessageRecord } from "../store/index.ts";
import type { Settings } from "../services/index.ts";

type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolAdapter: ApiToolAdapter;
  messages: MessageRecord[];
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  onChunk: (chunk: ApiRequestChunk) => void;
  signal: AbortSignal;
};

type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
};

type RequestWithRetryPayload<TResult> = {
  requestTag: string;
  request: () => Promise<TResult>;
  signal: AbortSignal;
};

const apiRetryTimeoutMs = 60000,
  apiRetryBaseDelayMs = 500,
  endpointSuffixes = ["/chat/completions", "/responses"],
  normalizeError = (error: unknown): Error => {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === "string" && error.trim()) {
      return new Error(error);
    }
    return new Error("请求失败");
  },
  createAbortError = (): Error => {
    const abortError = new Error("请求已取消");
    abortError.name = "AbortError";
    return abortError;
  },
  createEmptyStreamError = (): Error => {
    const streamError = new Error("流式响应为空");
    streamError.name = "EmptyStreamError";
    return streamError;
  },
  isAbortError = (error: unknown): boolean =>
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "APIUserAbortError"),
  isEmptyStreamError = (error: unknown): boolean =>
    error instanceof Error && error.name === "EmptyStreamError",
  waitForDelay = (delayMs: number, signal: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(createAbortError());
        return;
      }
      const onAbort = (): void => {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          reject(createAbortError());
        },
        timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
      signal.addEventListener("abort", onAbort, { once: true });
    }),
  resolveRetryDelay = (attemptIndex: number): number =>
    apiRetryBaseDelayMs * 2 ** attemptIndex,
  extractStatusCode = (error: unknown): number | null => {
    if (error instanceof OpenAI.APIError) {
      return typeof error.status === "number" ? error.status : null;
    }
    return null;
  },
  normalizeClientBaseUrl = (baseUrl: string): string => {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      throw new Error("Base URL 不能为空");
    }
    const normalized = trimmed.replace(/\/+$/, "");
    for (const suffix of endpointSuffixes) {
      if (normalized.endsWith(suffix)) {
        return normalized.slice(0, -suffix.length);
      }
    }
    return normalized;
  },
  createClient = (settings: Settings): OpenAI =>
    new OpenAI({
      apiKey: settings.apiKey,
      baseURL: normalizeClientBaseUrl(settings.baseUrl),
      timeout: apiRetryTimeoutMs,
      maxRetries: 0,
      dangerouslyAllowBrowser: true,
    }),
  requestWithRetry = async <TResult>({
    requestTag,
    request,
    signal,
  }: RequestWithRetryPayload<TResult>): Promise<TResult> => {
    const startedAt = Date.now();
    let attemptIndex = 0;
    for (;;) {
      try {
        return await request();
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          throw createAbortError();
        }
        const failure = normalizeError(error),
          elapsedMs = Date.now() - startedAt,
          remainingMs = apiRetryTimeoutMs - elapsedMs,
          statusCode = extractStatusCode(error),
          attemptsMade = attemptIndex + 1;
        if (remainingMs <= 0) {
          console.error("API 请求失败，已达到重试时限", {
            requestTag,
            attemptsMade,
            elapsedMs,
            statusCode,
            message: failure.message,
          });
          throw failure;
        }
        const delayMs = Math.min(resolveRetryDelay(attemptIndex), remainingMs);
        console.warn("API 请求失败，准备指数退避重试", {
          requestTag,
          attemptsMade,
          delayMs,
          elapsedMs,
          statusCode,
          message: failure.message,
        });
        await waitForDelay(delayMs, signal);
        attemptIndex += 1;
      }
    }
  },
  requestChat = async ({
    client,
    settings,
    systemPrompt,
    tools,
    toolAdapter,
    messages,
    onDelta,
    onStreamStart,
    onChunk,
    signal,
  }: RequestModelPayload & { client: OpenAI }): Promise<RequestModelResult> => {
    const strategy = getApiStrategy("chat", toolAdapter),
      streamRequestBody = strategy.buildStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      );
    let streamStarted = false;
    const streamState = { chunkCount: 0 };
    try {
      const stream = await requestWithRetry({
        requestTag: "chat.stream",
        request: () =>
          client.chat.completions.create(streamRequestBody, { signal }),
        signal,
      });
      onStreamStart();
      streamStarted = true;
      const toolCalls = await strategy.stream(stream, {
        onDelta,
        onChunk: (chunk) => {
          streamState.chunkCount += 1;
          onChunk(chunk);
        },
      });
      if (streamState.chunkCount === 0) {
        throw createEmptyStreamError();
      }
      return { toolCalls, reply: "", streamed: true };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (streamStarted && !isEmptyStreamError(error)) {
        throw normalizeError(error);
      }
      const failure = normalizeError(error);
      console.warn("聊天流式请求失败，准备回退为非流式", {
        message: failure.message,
      });
    }
    const nonStreamRequestBody = strategy.buildNonStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      ),
      response = await requestWithRetry({
        requestTag: "chat.non_stream",
        request: () =>
          client.chat.completions.create(nonStreamRequestBody, { signal }),
        signal,
      });
    return {
      toolCalls: strategy.extractToolCalls(response),
      reply: strategy.extractReply(response),
      streamed: false,
    };
  },
  requestResponses = async ({
    client,
    settings,
    systemPrompt,
    tools,
    toolAdapter,
    messages,
    onDelta,
    onStreamStart,
    onChunk,
    signal,
  }: RequestModelPayload & { client: OpenAI }): Promise<RequestModelResult> => {
    const strategy = getApiStrategy("responses", toolAdapter),
      streamRequestBody = strategy.buildStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      );
    let streamStarted = false;
    const streamState = { chunkCount: 0 };
    try {
      const stream = await requestWithRetry({
        requestTag: "responses.stream",
        request: () => client.responses.create(streamRequestBody, { signal }),
        signal,
      });
      onStreamStart();
      streamStarted = true;
      const toolCalls = await strategy.stream(stream, {
        onDelta,
        onChunk: (chunk) => {
          streamState.chunkCount += 1;
          onChunk(chunk);
        },
      });
      if (streamState.chunkCount === 0) {
        throw createEmptyStreamError();
      }
      return { toolCalls, reply: "", streamed: true };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (streamStarted && !isEmptyStreamError(error)) {
        throw normalizeError(error);
      }
      const failure = normalizeError(error);
      console.warn("Responses 流式请求失败，准备回退为非流式", {
        message: failure.message,
      });
    }
    const nonStreamRequestBody = strategy.buildNonStreamRequestBody(
        settings,
        systemPrompt,
        tools,
        messages,
      ),
      response = await requestWithRetry({
        requestTag: "responses.non_stream",
        request: () =>
          client.responses.create(nonStreamRequestBody, { signal }),
        signal,
      });
    return {
      toolCalls: strategy.extractToolCalls(response),
      reply: strategy.extractReply(response),
      streamed: false,
    };
  };

const requestModel = async (
  payload: RequestModelPayload,
): Promise<RequestModelResult> => {
  const client = createClient(payload.settings);
  if (payload.settings.apiType === "chat") {
    return requestChat({ ...payload, client });
  }
  return requestResponses({ ...payload, client });
};

export default requestModel;
