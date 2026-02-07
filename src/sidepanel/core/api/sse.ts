import { parseJson, type JsonValue } from "../../lib/utils/index.ts";
import type { ToolCall } from "../agent/definitions.ts";

type JsonObject = { [key: string]: JsonValue };

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
  text?: string;
};

export type ApiRequestChunk = {
  delta: string;
  toolCalls: ToolCall[];
};

type SsePayloadHandler = (payload: JsonValue, eventType: string) => void;

type ChatCompletionStreamHandlers = {
  onDelta: (delta: string) => void;
  onToolCallDelta?: (deltas: ChatToolCallDelta[]) => void;
  onChunk?: (chunk: ApiRequestChunk) => void;
};

type ResponsesStreamHandlers = {
  onDelta: (delta: string) => void;
  onToolCallEvent?: (
    payload: ResponsesToolCallEventPayload,
    eventType: string,
  ) => void;
  onChunk?: (chunk: ApiRequestChunk) => void;
};

const isJsonObject = (value: JsonValue): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  toJsonObject = (value: JsonValue | undefined): JsonObject | null => {
    if (value === undefined) {
      return null;
    }
    return isJsonObject(value) ? value : null;
  },
  toJsonArray = (value: JsonValue | undefined): JsonValue[] | null => {
    if (value === undefined || !Array.isArray(value)) {
      return null;
    }
    return value;
  },
  toStringValue = (value: JsonValue | undefined): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    return value;
  },
  toNumberValue = (value: JsonValue | undefined): number | null => {
    if (typeof value !== "number") {
      return null;
    }
    return value;
  },
  isPresent = <T>(value: T | null): value is T => value !== null,
  parseChatToolCallDeltaFunction = (
    value: JsonValue | undefined,
  ): ChatToolCallDelta["function"] | null => {
    const functionValue = toJsonObject(value);
    if (functionValue === null) {
      return null;
    }
    const parsedFunction: NonNullable<ChatToolCallDelta["function"]> = {},
      name = toStringValue(functionValue.name),
      argumentsText = toStringValue(functionValue.arguments);
    if (name !== null) {
      parsedFunction.name = name;
    }
    if (argumentsText !== null) {
      parsedFunction.arguments = argumentsText;
    }
    if (
      parsedFunction.name === undefined &&
      parsedFunction.arguments === undefined
    ) {
      return null;
    }
    return parsedFunction;
  },
  parseChatToolCallDelta = (value: JsonValue): ChatToolCallDelta | null => {
    const deltaValue = toJsonObject(value);
    if (deltaValue === null) {
      return null;
    }
    const delta: ChatToolCallDelta = {},
      index = toNumberValue(deltaValue.index),
      id = toStringValue(deltaValue.id),
      type = toStringValue(deltaValue.type),
      fn = parseChatToolCallDeltaFunction(deltaValue.function);
    if (index !== null) {
      delta.index = index;
    }
    if (id !== null) {
      delta.id = id;
    }
    if (type !== null) {
      delta.type = type;
    }
    if (fn !== null) {
      delta.function = fn;
    }
    if (
      delta.index === undefined &&
      delta.id === undefined &&
      delta.type === undefined &&
      delta.function === undefined
    ) {
      return null;
    }
    return delta;
  },
  extractPayloadErrorMessage = (payload: JsonValue): string => {
    const payloadValue = toJsonObject(payload);
    if (payloadValue === null) {
      return "";
    }
    const errorValue = toJsonObject(payloadValue.error);
    if (errorValue === null) {
      return "";
    }
    const message = toStringValue(errorValue.message);
    return message ?? "";
  },
  extractChatToolCallDeltas = (payload: JsonValue): ChatToolCallDelta[] => {
    const payloadValue = toJsonObject(payload);
    if (payloadValue === null) {
      return [];
    }
    const choices = toJsonArray(payloadValue.choices);
    if (choices === null || choices.length === 0) {
      return [];
    }
    const firstChoice = toJsonObject(choices[0]);
    if (firstChoice === null) {
      return [];
    }
    const delta = toJsonObject(firstChoice.delta);
    if (delta === null) {
      return [];
    }
    const toolCallsValue = toJsonArray(delta.tool_calls);
    if (toolCallsValue === null) {
      return [];
    }
    return toolCallsValue.map(parseChatToolCallDelta).filter(isPresent);
  },
  toToolCallFromChatDelta = (delta: ChatToolCallDelta): ToolCall => {
    const toolCall: ToolCall = {},
      id = delta.id,
      fn = delta.function;
    if (id !== undefined) {
      toolCall.id = id;
    }
    if (fn !== undefined) {
      const functionPart: NonNullable<ToolCall["function"]> = {};
      if (fn.name !== undefined) {
        functionPart.name = fn.name;
      }
      if (fn.arguments !== undefined) {
        functionPart.arguments = fn.arguments;
      }
      if (
        functionPart.name !== undefined ||
        functionPart.arguments !== undefined
      ) {
        toolCall.function = functionPart;
      }
    }
    return toolCall;
  },
  parseResponsesFunctionCallItem = (
    value: JsonValue | undefined,
  ): ResponsesFunctionCallItem | null => {
    const itemValue = toJsonObject(value);
    if (itemValue === null) {
      return null;
    }
    const item: ResponsesFunctionCallItem = {},
      type = toStringValue(itemValue.type),
      id = toStringValue(itemValue.id),
      callId = toStringValue(itemValue.call_id),
      name = toStringValue(itemValue.name),
      argumentsText = toStringValue(itemValue.arguments);
    if (type !== null) {
      item.type = type;
    }
    if (id !== null) {
      item.id = id;
    }
    if (callId !== null) {
      item.call_id = callId;
    }
    if (name !== null) {
      item.name = name;
    }
    if (argumentsText !== null) {
      item.arguments = argumentsText;
    }
    if (
      item.type === undefined &&
      item.id === undefined &&
      item.call_id === undefined &&
      item.name === undefined &&
      item.arguments === undefined
    ) {
      return null;
    }
    return item;
  },
  parseResponsesToolCallEventPayload = (
    value: JsonValue,
  ): ResponsesToolCallEventPayload => {
    const payloadValue = toJsonObject(value);
    if (payloadValue === null) {
      return {};
    }
    const payload: ResponsesToolCallEventPayload = {},
      type = toStringValue(payloadValue.type),
      outputIndex = toNumberValue(payloadValue.output_index),
      item = parseResponsesFunctionCallItem(payloadValue.item),
      delta = toStringValue(payloadValue.delta),
      argumentsText = toStringValue(payloadValue.arguments),
      name = toStringValue(payloadValue.name),
      text = toStringValue(payloadValue.text);
    if (type !== null) {
      payload.type = type;
    }
    if (outputIndex !== null) {
      payload.output_index = outputIndex;
    }
    if (item !== null) {
      payload.item = item;
    }
    if (delta !== null) {
      payload.delta = delta;
    }
    if (argumentsText !== null) {
      payload.arguments = argumentsText;
    }
    if (name !== null) {
      payload.name = name;
    }
    if (text !== null) {
      payload.text = text;
    }
    return payload;
  },
  resolveEventType = (
    payload: ResponsesToolCallEventPayload,
    eventType: string,
  ): string => payload.type ?? eventType;

export const streamSse = async (
  response: Response,
  onPayload: SsePayloadHandler,
): Promise<void> => {
  if (!response.body) {
    throw new Error("无法读取流式响应");
  }
  const reader = response.body.getReader(),
    decoder = new TextDecoder("utf-8");
  let buffer = "",
    currentEvent = "";
  const handleLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentEvent = "";
      return false;
    }
    if (trimmed.startsWith("event:")) {
      currentEvent = trimmed.replace(/^event:\s*/, "").trim();
      return false;
    }
    if (!trimmed.startsWith("data:")) {
      return false;
    }
    const dataText = trimmed.replace(/^data:\s*/, "");
    if (dataText === "[DONE]") {
      return true;
    }
    const payload = parseJson(dataText),
      errorMessage = extractPayloadErrorMessage(payload);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    onPayload(payload, currentEvent);
    currentEvent = "";
    return false;
  };
  let shouldStop = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (handleLine(line)) {
        shouldStop = true;
        break;
      }
    }
    if (shouldStop) {
      break;
    }
  }
  const tail = decoder.decode();
  if (tail.length > 0) {
    buffer += tail;
  }
  if (buffer.trim().length > 0 && !shouldStop) {
    handleLine(buffer);
  }
};

const deltaFromChat = (payload: JsonValue): string => {
    const payloadValue = toJsonObject(payload);
    if (payloadValue === null) {
      return "";
    }
    const choices = toJsonArray(payloadValue.choices);
    if (choices === null || choices.length === 0) {
      return "";
    }
    const firstChoice = toJsonObject(choices[0]);
    if (firstChoice === null) {
      return "";
    }
    const delta = toJsonObject(firstChoice.delta),
      deltaContent = delta === null ? null : toStringValue(delta.content);
    if (deltaContent !== null) {
      return deltaContent;
    }
    const choiceText = toStringValue(firstChoice.text);
    if (choiceText !== null) {
      return choiceText;
    }
    const message = toJsonObject(firstChoice.message),
      messageContent = message === null ? null : toStringValue(message.content);
    if (messageContent !== null) {
      return messageContent;
    }
    return "";
  },
  deltaFromResponses = (
    rawPayload: JsonValue,
    payload: ResponsesToolCallEventPayload,
    eventType: string,
  ): string => {
    const resolvedType = resolveEventType(payload, eventType);
    if (resolvedType === "response.output_text.delta") {
      return payload.delta ?? payload.text ?? "";
    }
    if (resolvedType === "response.refusal.delta") {
      return payload.delta ?? "";
    }
    return deltaFromChat(rawPayload);
  },
  toolCallsFromResponses = (
    payload: ResponsesToolCallEventPayload,
    eventType: string,
  ): ToolCall[] => {
    const resolvedType = resolveEventType(payload, eventType);
    if (
      resolvedType === "response.output_item.added" ||
      resolvedType === "response.output_item.done"
    ) {
      const item = payload.item;
      if (item?.type === "function_call") {
        return [
          {
            name: item.name,
            arguments: typeof item.arguments === "string" ? item.arguments : "",
          },
        ];
      }
    }
    if (resolvedType === "response.function_call_arguments.delta") {
      if (typeof payload.name === "string" && payload.name.length > 0) {
        return [
          {
            name: payload.name,
            arguments: typeof payload.delta === "string" ? payload.delta : "",
          },
        ];
      }
    }
    if (resolvedType === "response.function_call_arguments.done") {
      if (typeof payload.name === "string" && payload.name.length > 0) {
        return [
          {
            name: payload.name,
            arguments:
              typeof payload.arguments === "string" ? payload.arguments : "",
          },
        ];
      }
    }
    return [];
  };

export const streamChatCompletion = (
  response: Response,
  { onDelta, onToolCallDelta, onChunk }: ChatCompletionStreamHandlers,
): Promise<void> =>
  streamSse(response, (payload) => {
    const delta = deltaFromChat(payload),
      toolCallDeltas = extractChatToolCallDeltas(payload);
    if (delta) {
      onDelta(delta);
    }
    if (toolCallDeltas.length > 0 && onToolCallDelta) {
      onToolCallDelta(toolCallDeltas);
    }
    if (typeof onChunk === "function") {
      onChunk({
        delta,
        toolCalls: toolCallDeltas.map(toToolCallFromChatDelta),
      });
    }
  });

export const streamResponses = (
  response: Response,
  { onDelta, onToolCallEvent, onChunk }: ResponsesStreamHandlers,
): Promise<void> =>
  streamSse(response, (payload, eventType) => {
    const parsedPayload = parseResponsesToolCallEventPayload(payload),
      delta = deltaFromResponses(payload, parsedPayload, eventType);
    if (delta) {
      onDelta(delta);
    }
    if (onToolCallEvent) {
      onToolCallEvent(parsedPayload, eventType);
    }
    if (typeof onChunk === "function") {
      onChunk({
        delta,
        toolCalls: toolCallsFromResponses(parsedPayload, eventType),
      });
    }
  });

export const extractResponsesText = (data: JsonValue): string => {
  const payloadValue = toJsonObject(data);
  if (payloadValue === null) {
    return "";
  }
  const outputText = toStringValue(payloadValue.output_text);
  if (outputText !== null) {
    return outputText.trim();
  }
  const output = toJsonArray(payloadValue.output);
  if (output === null) {
    return "";
  }
  const texts: string[] = [];
  output.forEach((itemValue) => {
    const item = toJsonObject(itemValue);
    if (item === null) {
      return;
    }
    const itemType = toStringValue(item.type),
      content = toJsonArray(item.content);
    if (itemType !== "message" || content === null) {
      return;
    }
    content.forEach((partValue) => {
      const part = toJsonObject(partValue);
      if (part === null) {
        return;
      }
      const partType = toStringValue(part.type),
        text = toStringValue(part.text);
      if (partType === "output_text" && text !== null) {
        texts.push(text);
      }
    });
  });
  return texts.join("").trim();
};
