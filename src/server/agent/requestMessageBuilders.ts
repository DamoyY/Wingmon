import type {
  AnthropicMessageParam,
  ChatRequestMessage,
  MessageIntermediate,
  ResponsesInputItem,
} from "./requestPayloadTypes.ts";
import {
  mapMessageIntermediateToAnthropic,
  mapMessageIntermediateToChat,
  mapMessageIntermediateToResponses,
  mergeAnthropicMessages,
} from "./requestPayloadMappings.ts";
import type { Content as GeminiContent } from "@google/genai";
import type { MessageRecord } from "../../shared/state/panelStateContext.ts";
import { buildGeminiContentsFromIntermediates } from "./geminiContentBuilder.ts";
import { buildMessageIntermediates } from "./requestPayloadPreparation.ts";

export type {
  AnthropicMessageParam,
  ChatRequestMessage,
  ResponsesInputItem,
} from "./requestPayloadTypes.ts";

const mapMessageIntermediates = <TOutput>(
    messages: MessageIntermediate[],
    mapper: (message: MessageIntermediate) => TOutput[],
  ): TOutput[] => {
    const output: TOutput[] = [];
    messages.forEach((message) => {
      output.push(...mapper(message));
    });
    return output;
  },
  buildMappedOutput = <TOutput>(
    messages: MessageRecord[],
    mapper: (message: MessageIntermediate) => TOutput[],
  ): TOutput[] =>
    mapMessageIntermediates(buildMessageIntermediates(messages), mapper);

export const buildGeminiContents = (
  messages: MessageRecord[],
): GeminiContent[] =>
  buildGeminiContentsFromIntermediates(buildMessageIntermediates(messages));

export const buildChatMessages = (
  systemPrompt: string,
  messages: MessageRecord[],
): ChatRequestMessage[] => {
  const output: ChatRequestMessage[] = [];
  if (systemPrompt) {
    output.push({ content: systemPrompt, role: "system" });
  }
  output.push(...buildMappedOutput(messages, mapMessageIntermediateToChat));
  return output;
};

export const buildResponsesInput = (
  messages: MessageRecord[],
): ResponsesInputItem[] =>
  buildMappedOutput(messages, mapMessageIntermediateToResponses);

export const buildMessagesInput = (
  messages: MessageRecord[],
): AnthropicMessageParam[] =>
  mergeAnthropicMessages(
    buildMappedOutput(messages, mapMessageIntermediateToAnthropic),
  );
