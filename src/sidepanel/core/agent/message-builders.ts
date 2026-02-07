import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  type ToolCall,
  type ToolCallArguments,
} from "./definitions.ts";
import {
  collectPageReadDedupeSets,
  getToolOutputContent,
} from "./toolMessageContext.ts";
import type { MessageRecord } from "../store/index.ts";

type RawToolCall = NonNullable<MessageRecord["tool_calls"]>[number];
type MessageFieldValue = RawToolCall[string];

type Message = {
  role?: string;
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  toolContext?: MessageFieldValue;
};

type ToolCallEntry = {
  callId: string;
  name: string;
  arguments: ToolCallArguments;
};

type ChatToolCallForRequest = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: ToolCallArguments;
  };
};

type ChatRequestMessage =
  | {
      role: "system";
      content: string;
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
    }
  | {
      role: string;
      content?: string;
      tool_calls?: ChatToolCallForRequest[];
    };

type ResponsesInputItem =
  | {
      role: "user" | "assistant";
      content: string;
    }
  | {
      type: "function_call";
      call_id: string;
      name: string;
      arguments: ToolCallArguments;
    }
  | {
      type: "function_call_output";
      call_id: string;
      output: string;
    };

type ContextPlanItem = {
  index: number;
  includeToolCalls: boolean;
};

const isRecord = (
    value: MessageFieldValue,
  ): value is { [key: string]: MessageFieldValue } =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  resolveString = (value: MessageFieldValue): string =>
    typeof value === "string" ? value : "",
  isToolCall = (value: ToolCall | null): value is ToolCall => value !== null,
  resolveToolCall = (call: RawToolCall): ToolCall | null => {
    const toolCall: ToolCall = {},
      id = resolveString(call.id),
      callId = resolveString(call.call_id),
      name = resolveString(call.name),
      argumentsValue = call.arguments,
      functionValue = call.function;
    if (id) {
      toolCall.id = id;
    }
    if (callId) {
      toolCall.call_id = callId;
    }
    if (name) {
      toolCall.name = name;
    }
    if (typeof argumentsValue === "string") {
      toolCall.arguments = argumentsValue;
    }
    if (isRecord(functionValue)) {
      const functionName = resolveString(functionValue.name),
        functionArguments = functionValue.arguments,
        hasFunctionName = functionName.length > 0,
        hasFunctionArguments = typeof functionArguments === "string";
      if (hasFunctionName || hasFunctionArguments) {
        const fn: NonNullable<ToolCall["function"]> = {};
        if (hasFunctionName) {
          fn.name = functionName;
        }
        if (hasFunctionArguments) {
          fn.arguments = functionArguments;
        }
        toolCall.function = fn;
      }
    }
    if (
      !toolCall.id &&
      !toolCall.call_id &&
      !toolCall.name &&
      toolCall.function === undefined
    ) {
      return null;
    }
    return toolCall;
  },
  normalizeMessage = (message: MessageRecord): Message => {
    const normalized: Message = {};
    if (typeof message.role === "string") {
      normalized.role = message.role;
    }
    if (typeof message.content === "string") {
      normalized.content = message.content;
    }
    if (typeof message.tool_call_id === "string") {
      normalized.tool_call_id = message.tool_call_id;
    }
    if (typeof message.name === "string") {
      normalized.name = message.name;
    }
    if (Array.isArray(message.tool_calls)) {
      const toolCalls = message.tool_calls
        .map(resolveToolCall)
        .filter(isToolCall);
      if (toolCalls.length > 0) {
        normalized.tool_calls = toolCalls;
      }
    }
    if (message.toolContext !== undefined) {
      normalized.toolContext = message.toolContext;
    }
    return normalized;
  },
  normalizeMessages = (messages: MessageRecord[]): Message[] => {
    if (!Array.isArray(messages)) {
      throw new Error("messages 必须是数组");
    }
    return messages.map(normalizeMessage);
  },
  toChatToolCallForRequest = (
    entry: ToolCallEntry,
  ): ChatToolCallForRequest => ({
    id: entry.callId,
    type: "function",
    function: {
      name: entry.name,
      arguments: entry.arguments,
    },
  }),
  collectToolCallEntries = (
    toolCalls: ToolCall[] | undefined,
    removeToolCallIds: Set<string>,
  ): ToolCallEntry[] => {
    if (!Array.isArray(toolCalls)) {
      return [];
    }
    const entries: ToolCallEntry[] = [];
    toolCalls.forEach((call) => {
      const callId = getToolCallId(call),
        name = getToolCallName(call);
      if (removeToolCallIds.has(callId)) {
        return;
      }
      entries.push({
        callId,
        name,
        arguments: getToolCallArguments(call),
      });
    });
    return entries;
  },
  hasTextContent = (message: Message): boolean =>
    typeof message.content === "string" && message.content.trim().length > 0,
  collectUserMessageIndices = (messages: Message[]): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < messages.length; i += 1) {
      if (messages[i]?.role === "user") {
        indices.push(i);
      }
    }
    return indices;
  },
  resolveBoundaryUserMessageIndex = (messages: Message[]): number => {
    const userIndices = collectUserMessageIndices(messages),
      count = userIndices.length;
    if (count === 0) {
      return -1;
    }
    if (count === 1) {
      return userIndices[0];
    }
    return userIndices[count - 2];
  },
  stripToolCalls = (message: Message): Message => {
    if (!Array.isArray(message.tool_calls)) {
      return message;
    }
    const rest: Message = { ...message };
    delete rest.tool_calls;
    return rest;
  },
  buildHistoryPlan = (
    messages: Message[],
    endIndex: number,
  ): ContextPlanItem[] => {
    const plan: ContextPlanItem[] = [];
    let hasUser = false;
    for (let i = 0; i < endIndex; i += 1) {
      const message = messages[i];
      if (message.role === "user") {
        plan.push({ index: i, includeToolCalls: true });
        hasUser = true;
        continue;
      }
      if (hasUser && message.role === "assistant" && hasTextContent(message)) {
        plan.push({ index: i, includeToolCalls: false });
      }
    }
    return plan;
  },
  buildContextPlan = (messages: Message[]): ContextPlanItem[] => {
    const boundaryUserIndex = resolveBoundaryUserMessageIndex(messages);
    if (boundaryUserIndex < 0) {
      return [];
    }
    const plan = buildHistoryPlan(messages, boundaryUserIndex);
    for (let i = boundaryUserIndex; i < messages.length; i += 1) {
      plan.push({ index: i, includeToolCalls: true });
    }
    return plan;
  },
  buildContextMessages = (messages: Message[]): Message[] =>
    buildContextPlan(messages).map(({ index, includeToolCalls }) => {
      const message = messages[index];
      if (includeToolCalls) {
        return message;
      }
      return stripToolCalls(message);
    });

export const buildChatMessages = (
  systemPrompt: string,
  messages: MessageRecord[],
): ChatRequestMessage[] => {
  const output: ChatRequestMessage[] = [];
  if (systemPrompt) {
    output.push({ role: "system", content: systemPrompt });
  }
  const contextMessages = buildContextMessages(normalizeMessages(messages)),
    { removeToolCallIds, trimToolResponseIds } =
      collectPageReadDedupeSets(contextMessages);
  contextMessages.forEach((message) => {
    if (message.role === "tool") {
      const callId = message.tool_call_id;
      if (!callId) {
        throw new Error("工具响应缺少 tool_call_id");
      }
      if (removeToolCallIds.has(callId)) {
        return;
      }
      output.push({
        role: "tool",
        content: getToolOutputContent(message, trimToolResponseIds),
        tool_call_id: callId,
      });
      return;
    }
    const role = message.role;
    if (typeof role !== "string" || !role) {
      return;
    }
    const toolCallEntries = collectToolCallEntries(
      message.tool_calls,
      removeToolCallIds,
    );
    const entry: ChatRequestMessage = { role };
    if (typeof message.content === "string" && message.content.length > 0) {
      entry.content = message.content;
    }
    if (toolCallEntries.length > 0) {
      entry.tool_calls = toolCallEntries.map(toChatToolCallForRequest);
    }
    if (entry.content || (entry.tool_calls && entry.tool_calls.length > 0)) {
      output.push(entry);
    }
  });
  return output;
};

export const buildResponsesInput = (
  messages: MessageRecord[],
): ResponsesInputItem[] => {
  const output: ResponsesInputItem[] = [],
    contextMessages = buildContextMessages(normalizeMessages(messages)),
    { removeToolCallIds, trimToolResponseIds } =
      collectPageReadDedupeSets(contextMessages);
  contextMessages.forEach((message) => {
    if (message.role === "tool") {
      const callId = message.tool_call_id;
      if (!callId) {
        throw new Error("工具响应缺少 tool_call_id");
      }
      if (removeToolCallIds.has(callId)) {
        return;
      }
      output.push({
        type: "function_call_output",
        call_id: callId,
        output: getToolOutputContent(message, trimToolResponseIds),
      });
      return;
    }
    if (message.role !== "user" && message.role !== "assistant") {
      return;
    }
    if (typeof message.content === "string" && message.content.length > 0) {
      output.push({
        role: message.role,
        content: message.content,
      });
    }
    const toolCallEntries = collectToolCallEntries(
      message.tool_calls,
      removeToolCallIds,
    );
    toolCallEntries.forEach((entry) => {
      output.push({
        type: "function_call",
        call_id: entry.callId,
        name: entry.name,
        arguments: entry.arguments,
      });
    });
  });
  return output;
};
