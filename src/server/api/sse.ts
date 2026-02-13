import type {
  Response,
  ResponseOutputItem,
  ResponseOutputMessage,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { ToolCall } from "../agent/definitions.ts";

type StreamChatToolCall = NonNullable<
  NonNullable<
    ChatCompletionChunk["choices"][number]["delta"]["tool_calls"]
  >[number]
>;

type ResponsesFunctionCallOutputItem = Extract<
  ResponseOutputItem,
  { type: "function_call" }
>;

export type ChatToolCallDelta = {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type ResponsesFunctionCallItem = {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
};

export type ResponsesToolCallEventPayload = {
  type?: string;
  output_index?: number;
  item?: ResponsesFunctionCallItem;
  delta?: string;
  arguments?: string;
  name?: string;
};

export type ApiRequestChunk = {
  delta: string;
  toolCalls: ToolCall[];
};

const isFunctionCallOutputItem = (
    item: ResponseOutputItem,
  ): item is ResponsesFunctionCallOutputItem => item.type === "function_call",
  isMessageOutputItem = (
    item: ResponseOutputItem,
  ): item is ResponseOutputMessage => item.type === "message",
  toResponsesFunctionCallItem = (
    item: ResponsesFunctionCallOutputItem,
  ): ResponsesFunctionCallItem => {
    const entry: ResponsesFunctionCallItem = { type: item.type };
    if (typeof item.id === "string" && item.id.length > 0) {
      entry.id = item.id;
    }
    if (typeof item.call_id === "string" && item.call_id.length > 0) {
      entry.call_id = item.call_id;
    }
    if (typeof item.name === "string" && item.name.length > 0) {
      entry.name = item.name;
    }
    if (typeof item.arguments === "string") {
      entry.arguments = item.arguments;
    }
    return entry;
  },
  toChatToolCallDelta = (toolCall: StreamChatToolCall): ChatToolCallDelta => {
    const delta: ChatToolCallDelta = {
      index: toolCall.index,
    };
    if (typeof toolCall.id === "string" && toolCall.id.length > 0) {
      delta.id = toolCall.id;
    }
    if (toolCall.type === "function") {
      delta.type = "function";
    }
    if (toolCall.function) {
      const functionPayload: NonNullable<ChatToolCallDelta["function"]> = {};
      if (
        typeof toolCall.function.name === "string" &&
        toolCall.function.name.length > 0
      ) {
        functionPayload.name = toolCall.function.name;
      }
      if (typeof toolCall.function.arguments === "string") {
        functionPayload.arguments = toolCall.function.arguments;
      }
      if (
        functionPayload.name !== undefined ||
        functionPayload.arguments !== undefined
      ) {
        delta.function = functionPayload;
      }
    }
    return delta;
  };

export const getChatDeltaText = (chunk: ChatCompletionChunk): string => {
  const firstChoice = chunk.choices.at(0);
  if (firstChoice === undefined) {
    return "";
  }
  if (typeof firstChoice.delta.content === "string") {
    return firstChoice.delta.content;
  }
  if (typeof firstChoice.delta.refusal === "string") {
    return firstChoice.delta.refusal;
  }
  return "";
};

export const getChatToolCallDeltas = (
  chunk: ChatCompletionChunk,
): ChatToolCallDelta[] => {
  const firstChoice = chunk.choices.at(0);
  if (
    firstChoice === undefined ||
    !Array.isArray(firstChoice.delta.tool_calls)
  ) {
    return [];
  }
  return firstChoice.delta.tool_calls.map(toChatToolCallDelta);
};

export const getToolCallsFromChatDeltas = (
  deltas: ChatToolCallDelta[],
): ToolCall[] =>
  deltas.map((delta) => {
    const call: ToolCall = {};
    if (typeof delta.id === "string" && delta.id.length > 0) {
      call.id = delta.id;
    }
    if (delta.function) {
      const functionPayload: NonNullable<ToolCall["function"]> = {};
      if (
        typeof delta.function.name === "string" &&
        delta.function.name.length > 0
      ) {
        functionPayload.name = delta.function.name;
      }
      if (typeof delta.function.arguments === "string") {
        functionPayload.arguments = delta.function.arguments;
      }
      if (
        functionPayload.name !== undefined ||
        functionPayload.arguments !== undefined
      ) {
        call.function = functionPayload;
      }
    }
    return call;
  });

export const getResponsesToolCallEventPayload = (
  event: ResponseStreamEvent,
): ResponsesToolCallEventPayload | null => {
  if (
    event.type === "response.output_item.added" ||
    event.type === "response.output_item.done"
  ) {
    if (!isFunctionCallOutputItem(event.item)) {
      return null;
    }
    return {
      item: toResponsesFunctionCallItem(event.item),
      output_index: event.output_index,
      type: event.type,
    };
  }
  if (event.type === "response.function_call_arguments.delta") {
    return {
      delta: event.delta,
      output_index: event.output_index,
      type: event.type,
    };
  }
  if (event.type === "response.function_call_arguments.done") {
    return {
      arguments: event.arguments,
      name: event.name,
      output_index: event.output_index,
      type: event.type,
    };
  }
  return null;
};

export const getResponsesDeltaText = (event: ResponseStreamEvent): string => {
  if (event.type === "response.output_text.delta") {
    return event.delta;
  }
  if (event.type === "response.refusal.delta") {
    return event.delta;
  }
  return "";
};

const resolveResponsesEventType = (
  payload: ResponsesToolCallEventPayload,
  eventType: string,
): string => payload.type ?? eventType;

export const getToolCallsFromResponsesEvent = (
  payload: ResponsesToolCallEventPayload,
  eventType: string,
): ToolCall[] => {
  const resolvedType = resolveResponsesEventType(payload, eventType);
  if (
    resolvedType === "response.output_item.added" ||
    resolvedType === "response.output_item.done"
  ) {
    const item = payload.item;
    if (item?.type === "function_call") {
      return [
        {
          arguments: typeof item.arguments === "string" ? item.arguments : "",
          name: item.name,
        },
      ];
    }
  }
  if (resolvedType === "response.function_call_arguments.delta") {
    if (typeof payload.name === "string" && payload.name.length > 0) {
      return [
        {
          arguments: typeof payload.delta === "string" ? payload.delta : "",
          name: payload.name,
        },
      ];
    }
  }
  if (resolvedType === "response.function_call_arguments.done") {
    if (typeof payload.name === "string" && payload.name.length > 0) {
      return [
        {
          arguments:
            typeof payload.arguments === "string" ? payload.arguments : "",
          name: payload.name,
        },
      ];
    }
  }
  return [];
};

const extractResponsesOutputMessageText = (
  item: ResponseOutputMessage,
): string =>
  item.content
    .filter((part) => part.type === "output_text")
    .map((part) => part.text)
    .join("");

export const extractResponsesText = (response: Response): string => {
  if (
    typeof response.output_text === "string" &&
    response.output_text.trim().length > 0
  ) {
    return response.output_text.trim();
  }
  const texts = response.output
    .filter(isMessageOutputItem)
    .map(extractResponsesOutputMessageText)
    .filter((text) => text.length > 0);
  return texts.join("").trim();
};
