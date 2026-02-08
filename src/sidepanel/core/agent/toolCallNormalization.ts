import type { MessageRecord } from "../store/index.ts";
import { addMessage, state, updateMessage } from "../store/index.ts";
import type { ToolCall } from "./definitions.ts";
import { createRandomId } from "../../lib/utils/index.ts";

type RawChatToolCallDelta = {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type ChatToolCallCollectorItem = {
  id?: string;
  call_id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatToolCallCollector = Partial<
  Record<number, ChatToolCallCollectorItem>
>;

type ResponsesToolCallCollectorItem = {
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
};

export type ResponsesToolCallCollector = Partial<
  Record<number, ResponsesToolCallCollectorItem>
>;

type ResponsesToolCallEventPayload = {
  type?: string;
  output_index?: number;
  item?: {
    type?: string;
    id?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
  };
  delta?: string;
  arguments?: string;
  name?: string;
};

type ChatCompletionToolCall = {
  id?: string;
  call_id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type ChatCompletionMessage = {
  id?: string;
  tool_calls?: ChatCompletionToolCall[];
  function_call?: {
    name?: string;
    arguments?: string;
  };
};

type ChatCompletionData = {
  choices?: Array<{
    message?: ChatCompletionMessage;
  }>;
};

type ResponsesOutputItem = {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
};

type ResponsesData = {
  output?: ResponsesOutputItem[];
};

type NormalizedToolCall = ToolCall & {
  id: string;
  call_id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type StoreToolCall = NonNullable<MessageRecord["tool_calls"]>[number];

type NormalizeToolCallInput = {
  id?: string;
  callId?: string;
  name?: string;
  argumentsText?: string;
  defaultArguments?: string;
};

const normalizeToolCall = ({
    id,
    callId,
    name,
    argumentsText,
    defaultArguments = "",
  }: NormalizeToolCallInput): NormalizedToolCall | null => {
    if (!name) {
      return null;
    }
    const resolvedId = callId || id;
    if (!resolvedId) {
      return null;
    }
    const resolvedArguments =
      typeof argumentsText === "string" ? argumentsText : defaultArguments;
    return {
      call_id: resolvedId,
      function: {
        arguments: resolvedArguments,
        name,
      },
      id: resolvedId,
    };
  },
  isNormalizedToolCall = (
    value: NormalizedToolCall | null,
  ): value is NormalizedToolCall => value !== null,
  normalizeToolCallList = <TItem>(
    items: TItem[],
    mapper: (item: TItem) => NormalizeToolCallInput,
  ): NormalizedToolCall[] =>
    items
      .map((item) => normalizeToolCall(mapper(item)))
      .filter(isNormalizedToolCall),
  toStoreToolCall = (call: ToolCall): StoreToolCall => {
    const entry: StoreToolCall = {};
    if (typeof call.id === "string") {
      entry.id = call.id;
    }
    if (typeof call.call_id === "string") {
      entry.call_id = call.call_id;
    }
    if (typeof call.name === "string") {
      entry.name = call.name;
    }
    if (call.arguments !== undefined) {
      entry.arguments = call.arguments;
    }
    const functionPart = call.function;
    if (functionPart) {
      const functionEntry: StoreToolCall = {};
      if (typeof functionPart.name === "string") {
        functionEntry.name = functionPart.name;
      }
      if (typeof functionPart.arguments === "string") {
        functionEntry.arguments = functionPart.arguments;
      }
      entry.function = functionEntry;
    }
    return entry;
  },
  normalizeToolCallsForStore = (toolCalls: ToolCall[]): StoreToolCall[] =>
    toolCalls.map(toStoreToolCall);

export const addChatToolCallDelta = (
  collector: ChatToolCallCollector,
  deltas: RawChatToolCallDelta[],
): ChatToolCallCollector => {
  const next: ChatToolCallCollector = { ...collector };
  deltas.forEach((delta) => {
    const index = typeof delta.index === "number" ? delta.index : 0,
      existing = next[index] || {
        function: {
          arguments: "",
          name: delta.function?.name || "",
        },
        id: delta.id,
        type: delta.type || "function",
      },
      updated: ChatToolCallCollectorItem = {
        ...existing,
        function: { ...existing.function },
      };
    if (delta.id) {
      updated.id = delta.id;
    }
    if (delta.type) {
      updated.type = delta.type;
    }
    if (delta.function?.name) {
      updated.function.name = delta.function.name;
    }
    if (typeof delta.function?.arguments === "string") {
      updated.function.arguments = `${updated.function.arguments}${delta.function.arguments}`;
    }
    next[index] = updated;
  });
  return next;
};

export const finalizeChatToolCalls = (
  collector: ChatToolCallCollector,
): NormalizedToolCall[] =>
  normalizeToolCallList(Object.values(collector), (call) => ({
    argumentsText: call.function.arguments,
    callId: call.call_id,
    id: call.id,
    name: call.function.name,
  }));

export const addResponsesToolCallEvent = (
  collector: ResponsesToolCallCollector,
  payload: ResponsesToolCallEventPayload,
  eventType: string,
): ResponsesToolCallCollector => {
  const next: ResponsesToolCallCollector = { ...collector },
    resolvedType = payload.type || eventType;
  if (resolvedType === "response.output_item.added") {
    if (
      payload.item?.type === "function_call" &&
      typeof payload.output_index === "number"
    ) {
      next[payload.output_index] = { ...payload.item };
    }
    return next;
  }
  if (resolvedType === "response.output_item.done") {
    if (
      payload.item?.type === "function_call" &&
      typeof payload.output_index === "number"
    ) {
      next[payload.output_index] = { ...payload.item };
    }
    return next;
  }
  if (resolvedType === "response.function_call_arguments.delta") {
    const index = payload.output_index;
    if (typeof index !== "number" || !next[index]) {
      return next;
    }
    const current = next[index],
      deltaText = typeof payload.delta === "string" ? payload.delta : "";
    next[index] = {
      ...current,
      arguments: `${current.arguments || ""}${deltaText}`,
    };
    return next;
  }
  if (resolvedType === "response.function_call_arguments.done") {
    const index = payload.output_index;
    if (typeof index !== "number" || !next[index]) {
      return next;
    }
    if (typeof payload.arguments === "string") {
      next[index] = {
        ...next[index],
        arguments: payload.arguments,
      };
    }
  }
  return next;
};

export const finalizeResponsesToolCalls = (
  collector: ResponsesToolCallCollector,
): NormalizedToolCall[] =>
  normalizeToolCallList(Object.values(collector), (call) => ({
    id: call.id,
    callId: call.call_id,
    name: call.name,
    argumentsText: call.arguments,
    defaultArguments: "",
  }));

export const extractChatToolCalls = (
  data: ChatCompletionData,
): NormalizedToolCall[] => {
  const message = data.choices?.[0]?.message;
  if (!message) {
    return [];
  }
  if (Array.isArray(message.tool_calls)) {
    return normalizeToolCallList(message.tool_calls, (call) => ({
      id: call.id,
      callId: call.call_id,
      name: call.function?.name,
      argumentsText: call.function?.arguments,
    }));
  }
  if (message.function_call) {
    const call = message.function_call,
      resolvedId = message.id || call.name;
    return normalizeToolCallList([call], () => ({
      argumentsText: call.arguments,
      callId: resolvedId,
      defaultArguments: "",
      id: resolvedId,
      name: call.name,
    }));
  }
  return [];
};

export const extractResponsesToolCalls = (
  data: ResponsesData,
): NormalizedToolCall[] => {
  const output = Array.isArray(data.output) ? data.output : [];
  return normalizeToolCallList(
    output.filter((item) => item.type === "function_call"),
    (item) => ({
      argumentsText: item.arguments,
      callId: item.call_id,
      defaultArguments: "",
      id: item.id,
      name: item.name,
    }),
  );
};

export const attachToolCallsToAssistant = (
  toolCalls: ToolCall[],
  assistantIndex?: number,
): void => {
  if (toolCalls.length === 0) {
    return;
  }
  const normalizedToolCalls = normalizeToolCallsForStore(toolCalls),
    index =
      typeof assistantIndex === "number"
        ? assistantIndex
        : state.messages.length - 1,
    target = state.messages.at(index);
  if (target?.role === "assistant") {
    updateMessage(index, { tool_calls: normalizedToolCalls });
    return;
  }
  addMessage({
    content: "",
    groupId: createRandomId("assistant"),
    role: "assistant",
    tool_calls: normalizedToolCalls,
  });
};
