import type { ApiStrategy, ApiStrategyMap } from "./apiContracts.ts";
import {
  buildChatNonStreamRequestBody,
  buildChatStreamRequestBody,
  buildGeminiNonStreamRequestBody,
  buildGeminiStreamRequestBody,
  buildMessagesNonStreamRequestBody,
  buildMessagesStreamRequestBody,
  buildResponsesNonStreamRequestBody,
  buildResponsesStreamRequestBody,
} from "./payloadAdapters.ts";
import {
  chatProtocolHandlers,
  geminiProtocolHandlers,
  messagesProtocolHandlers,
  responsesProtocolHandlers,
} from "./streamProtocols.ts";
import type { ApiType } from "../services/index.ts";

export type { ApiRequestChunk } from "./sse.ts";
export type {
  ApiStrategy,
  BaseApiStrategy,
  ChatApiStrategy,
  ChatFallbackRequestBody,
  ChatRequestBody,
  MessagesApiStrategy,
  ResponsesApiStrategy,
  ResponsesFallbackRequestBody,
  ResponsesRequestBody,
  StreamEventHandlers,
  GeminiApiStrategy,
  GeminiRequestBody,
  GeminiFallbackRequestBody,
} from "./apiContracts.ts";

const createApiStrategies = (): ApiStrategyMap => ({
  chat: {
    buildNonStreamRequestBody: buildChatNonStreamRequestBody,
    buildStreamRequestBody: buildChatStreamRequestBody,
    ...chatProtocolHandlers,
  },
  gemini: {
    buildNonStreamRequestBody: buildGeminiNonStreamRequestBody,
    buildStreamRequestBody: buildGeminiStreamRequestBody,
    ...geminiProtocolHandlers,
  },
  messages: {
    buildNonStreamRequestBody: buildMessagesNonStreamRequestBody,
    buildStreamRequestBody: buildMessagesStreamRequestBody,
    ...messagesProtocolHandlers,
  },
  responses: {
    buildNonStreamRequestBody: buildResponsesNonStreamRequestBody,
    buildStreamRequestBody: buildResponsesStreamRequestBody,
    ...responsesProtocolHandlers,
  },
});

export default function getApiStrategy(apiType: ApiType): ApiStrategy {
  const strategyMap = createApiStrategies();
  switch (apiType) {
    case "chat":
      return strategyMap.chat;
    case "responses":
      return strategyMap.responses;
    case "messages":
      return strategyMap.messages;
    case "gemini":
      return strategyMap.gemini;
    default:
      throw new Error(`Unsupported API type: ${String(apiType)}`);
  }
}
