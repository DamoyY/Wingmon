import {
  type AnthropicToolCallCollector,
  type ChatCompletionData,
  type ChatToolCallCollector,
  type ResponsesData,
  type ResponsesToolCallCollector,
  addAnthropicToolCallEvent,
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  extractAnthropicToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeAnthropicToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
} from "../agent/toolCallNormalization.ts";
import type {
  ChatApiStrategy,
  MessagesApiStrategy,
  ResponsesApiStrategy,
} from "./apiContracts.ts";
import {
  extractResponsesText,
  getChatDeltaText,
  getChatToolCallDeltas,
  getResponsesDeltaText,
  getResponsesToolCallEventPayload,
  getToolCallsFromChatDeltas,
  getToolCallsFromResponsesEvent,
} from "./sse.ts";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatCompletion } from "openai/resources/chat/completions";
import type { Response } from "openai/resources/responses/responses";

type ChatProtocolHandlers = Pick<
  ChatApiStrategy,
  "stream" | "extractReply" | "extractToolCalls"
>;
type MessagesProtocolHandlers = Pick<
  MessagesApiStrategy,
  "stream" | "extractReply" | "extractToolCalls"
>;
type ResponsesProtocolHandlers = Pick<
  ResponsesApiStrategy,
  "stream" | "extractReply" | "extractToolCalls"
>;

const toChatExtractionPayload = (data: ChatCompletion): ChatCompletionData => {
    const firstChoice = data.choices.at(0);
    if (!firstChoice) {
      return {};
    }
    return { choices: [{ message: firstChoice.message }] };
  },
  toResponsesExtractionPayload = (data: Response): ResponsesData => ({
    output: data.output,
  }),
  extractChatReply = (data: ChatCompletion): string =>
    data.choices.at(0)?.message.content?.trim() || "";

export const chatProtocolHandlers: ChatProtocolHandlers = {
  extractReply: (data) => extractChatReply(data),
  extractToolCalls: (data) =>
    extractChatToolCalls(toChatExtractionPayload(data)),
  stream: async (stream, { onDelta, onChunk }) => {
    let collector: ChatToolCallCollector = {};
    for await (const chunk of stream) {
      const delta = getChatDeltaText(chunk),
        toolCallDeltas = getChatToolCallDeltas(chunk),
        toolCalls = getToolCallsFromChatDeltas(toolCallDeltas);
      if (delta !== "") {
        onDelta(delta);
      }
      if (toolCallDeltas.length > 0) {
        collector = addChatToolCallDelta(collector, toolCallDeltas);
      }
      onChunk({ delta, toolCalls });
    }
    return finalizeChatToolCalls(collector);
  },
};

export const messagesProtocolHandlers: MessagesProtocolHandlers = {
  extractReply: (data) =>
    data.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim(),
  extractToolCalls: (data) => extractAnthropicToolCalls(data),
  stream: async (stream, { onDelta, onChunk }) => {
    let collector: AnthropicToolCallCollector = {};
    for await (const event of stream) {
      let delta = "";
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        delta = event.delta.text;
      }
      if (delta !== "") {
        onDelta(delta);
      }
      collector = addAnthropicToolCallEvent(collector, event);
      onChunk({ delta, toolCalls: [] });
    }
    return finalizeAnthropicToolCalls(collector);
  },
};

export const responsesProtocolHandlers: ResponsesProtocolHandlers = {
  extractReply: (data) => extractResponsesText(data),
  extractToolCalls: (data) =>
    extractResponsesToolCalls(toResponsesExtractionPayload(data)),
  stream: async (stream, { onDelta, onChunk }) => {
    let collector: ResponsesToolCallCollector = {};
    for await (const event of stream) {
      const payload = getResponsesToolCallEventPayload(event),
        delta = getResponsesDeltaText(event),
        toolCalls =
          payload === null
            ? []
            : getToolCallsFromResponsesEvent(payload, event.type);
      if (delta !== "") {
        onDelta(delta);
      }
      if (payload !== null) {
        collector = addResponsesToolCallEvent(collector, payload, event.type);
      }
      onChunk({ delta, toolCalls });
    }
    return finalizeResponsesToolCalls(collector);
  },
};
