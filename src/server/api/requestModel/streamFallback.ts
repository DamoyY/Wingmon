import type { ToolCall } from "../../agent/definitions.ts";
import type { ApiRequestChunk } from "../strategies.ts";
import {
  createEmptyStreamError,
  isAbortError,
  isEmptyStreamError,
  normalizeError,
  requestWithRetry,
} from "../request-utils.ts";
import { extractStatusCode } from "./statusCode.ts";
import type { RequestModelResult, StreamRetryTracker } from "./types.ts";

type StreamConsumer<TStream> = (
  stream: TStream,
  handlers: {
    onDelta: (delta: string) => void;
    onChunk: (chunk: ApiRequestChunk) => void;
  },
) => Promise<ToolCall[]>;

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
  onChunk,
  onDelta,
  onStreamStart,
  requestStream,
  requestTag,
  signal,
  tracker,
}: {
  consumeStream: StreamConsumer<TStream>;
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

export type StreamFallbackExecution<
  TStream,
  TResponse,
  TStreamRequestBody,
  TNonStreamRequestBody,
> = {
  buildNonStreamRequestBody: () => TNonStreamRequestBody;
  buildStreamRequestBody: () => TStreamRequestBody;
  consumeStream: StreamConsumer<TStream>;
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

export const executeStreamFallbackRequest = async <
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
