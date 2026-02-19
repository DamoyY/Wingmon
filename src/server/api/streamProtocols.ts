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
  GeminiApiStrategy,
  MessagesApiStrategy,
  ResponsesApiStrategy,
} from "./apiContracts.ts";
import type {
  FunctionCall,
  GenerateContentResponse,
  Part,
} from "@google/genai";
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
import type { ToolCall } from "../agent/definitions.ts";

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
type GeminiProtocolHandlers = Pick<
  GeminiApiStrategy,
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
    data.choices.at(0)?.message.content?.trim() || "",
  serializeGeminiFunctionArguments = (args: unknown): string => {
    if (typeof args === "string") {
      return args;
    }
    try {
      const serialized = JSON.stringify(args ?? {});
      if (typeof serialized !== "string") {
        throw new Error("Gemini 工具参数序列化结果无效");
      }
      return serialized;
    } catch (error) {
      console.error("Gemini 工具参数序列化失败", error);
      throw new Error("Gemini 工具参数序列化失败");
    }
  },
  toGeminiToolCall = (
    call: FunctionCall,
    index: number,
    thoughtSignature?: string,
  ): ToolCall | null => {
    if (typeof call.name !== "string" || call.name.length === 0) {
      return null;
    }
    const callId =
        typeof call.id === "string" && call.id.length > 0
          ? call.id
          : `gemini_${String(index)}_${call.name}`,
      serializedArguments = serializeGeminiFunctionArguments(call.args),
      normalizedThoughtSignature =
        typeof thoughtSignature === "string" && thoughtSignature.length > 0
          ? thoughtSignature
          : "";
    const toolCall: ToolCall = {
      arguments: serializedArguments,
      call_id: callId,
      function: {
        arguments: serializedArguments,
        name: call.name,
      },
      id: callId,
      name: call.name,
    };
    if (normalizedThoughtSignature) {
      toolCall.thought_signature = normalizedThoughtSignature;
    }
    return toolCall;
  },
  extractGeminiFunctionCallParts = (
    data: GenerateContentResponse,
  ): Array<Part & { functionCall: FunctionCall }> => {
    const candidate = data.candidates?.at(0),
      parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      return [];
    }
    return parts.filter(
      (part): part is Part & { functionCall: FunctionCall } =>
        part.functionCall !== undefined,
    );
  },
  extractGeminiToolCallsFromParts = (
    data: GenerateContentResponse,
  ): ToolCall[] => {
    const functionCallParts = extractGeminiFunctionCallParts(data);
    if (functionCallParts.length === 0) {
      return [];
    }
    return functionCallParts
      .map((part, index) =>
        toGeminiToolCall(part.functionCall, index, part.thoughtSignature),
      )
      .filter((call): call is ToolCall => call !== null);
  },
  extractGeminiToolCalls = (data: GenerateContentResponse): ToolCall[] => {
    const callsFromParts = extractGeminiToolCallsFromParts(data);
    if (callsFromParts.length > 0) {
      return callsFromParts;
    }
    const functionCalls = data.functionCalls;
    if (!Array.isArray(functionCalls)) {
      return [];
    }
    return functionCalls
      .map((call, index) => toGeminiToolCall(call, index))
      .filter((call): call is ToolCall => call !== null);
  };

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

export const geminiProtocolHandlers: GeminiProtocolHandlers = {
  extractReply: (data) => data.text?.trim() ?? "",
  extractToolCalls: (data) => extractGeminiToolCalls(data),
  stream: async (stream, { onDelta, onChunk }) => {
    const collectedToolCalls = new Map<string, ToolCall>();
    for await (const chunk of stream) {
      const delta = chunk.text ?? "",
        toolCalls = extractGeminiToolCalls(chunk);
      if (delta !== "") {
        onDelta(delta);
      }
      toolCalls.forEach((call) => {
        const callId = call.call_id;
        if (typeof callId === "string" && callId.length > 0) {
          const existing = collectedToolCalls.get(callId);
          if (
            existing &&
            typeof existing.thought_signature === "string" &&
            existing.thought_signature.length > 0 &&
            (typeof call.thought_signature !== "string" ||
              call.thought_signature.length === 0)
          ) {
            call.thought_signature = existing.thought_signature;
          }
          collectedToolCalls.set(callId, call);
        }
      });
      onChunk({ delta, toolCalls });
    }
    return Array.from(collectedToolCalls.values());
  },
};
