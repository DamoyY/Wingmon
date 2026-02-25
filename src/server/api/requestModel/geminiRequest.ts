import type { GenerateContentParameters } from "@google/genai";
import { createGeminiClient } from "../clients.ts";
import getApiStrategy, { type GeminiApiStrategy } from "../strategies.ts";
import { executeStreamFallbackRequest } from "./streamFallback.ts";
import type { RequestModelPayload, RequestModelResult } from "./types.ts";

const withGeminiAbortSignal = (
  body: GenerateContentParameters,
  signal: AbortSignal,
): GenerateContentParameters => ({
  ...body,
  config: { ...body.config, abortSignal: signal },
});

export const executeGeminiRequest = async (
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
