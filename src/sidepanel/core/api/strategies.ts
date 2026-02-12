import type { ApiStrategy, ApiStrategyMap } from "./apiContracts.ts";
import {
  buildChatNonStreamRequestBody,
  buildChatStreamRequestBody,
  buildMessagesNonStreamRequestBody,
  buildMessagesStreamRequestBody,
  buildResponsesNonStreamRequestBody,
  buildResponsesStreamRequestBody,
} from "./payloadAdapters.ts";
import {
  chatProtocolHandlers,
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
} from "./apiContracts.ts";

const createApiStrategies = (): ApiStrategyMap => ({
  chat: {
    buildNonStreamRequestBody: buildChatNonStreamRequestBody,
    buildStreamRequestBody: buildChatStreamRequestBody,
    ...chatProtocolHandlers,
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
    default:
      throw new Error(`Unsupported API type: ${String(apiType)}`);
  }
}
