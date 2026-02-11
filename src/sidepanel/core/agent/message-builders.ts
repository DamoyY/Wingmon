import { type JsonValue, parseJson } from "../../lib/utils/index.ts";
import {
  type ToolCall,
  type ToolCallArguments,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
} from "./definitions.ts";
import {
  collectPageReadDedupeSets,
  getToolOutputContent,
} from "./toolMessageContext.ts";
import {
  isJsonObject,
  isRecord,
  resolveString,
} from "../../../shared/index.ts";
import type { MessageRecord } from "../store/index.ts";

type JsonObject = Record<string, JsonValue>;
type MessageFieldValue = RawToolCall[string];
type RawToolCall = NonNullable<MessageRecord["tool_calls"]>[number];

type Message = {
  content?: string;
  name?: string;
  role?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  toolContext?: MessageFieldValue;
};

type ToolCallEntry = {
  arguments: ToolCallArguments;
  callId: string;
  name: string;
};

type ChatToolCallForRequest = {
  function: {
    name: string;
    arguments: ToolCallArguments;
  };
  id: string;
  type: "function";
};

type ChatRequestMessage =
  | {
      content: string;
      role: "system";
    }
  | {
      content: string;
      role: "tool";
      tool_call_id: string;
    }
  | {
      content?: string;
      role: string;
      tool_calls?: ChatToolCallForRequest[];
    };

type ResponsesInputItem =
  | {
      content: string;
      role: "user" | "assistant";
    }
  | {
      arguments: ToolCallArguments;
      call_id: string;
      name: string;
      type: "function_call";
    }
  | {
      call_id: string;
      output: string;
      type: "function_call_output";
    };

export type AnthropicMessageParam = {
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            id: string;
            input: JsonObject;
            name: string;
            type: "tool_use";
          }
        | { type: "tool_result"; tool_use_id: string; content: string }
      >;
  role: "user" | "assistant";
};

type ContextPlanItem = {
  includeToolCalls: boolean;
  index: number;
};

type MessageIntermediate =
  | {
      content: string;
      kind: "conversation";
      role: string;
      toolCallEntries: ToolCallEntry[];
    }
  | {
      callId: string;
      content: string;
      kind: "toolResult";
    };

const isToolCall = (value: ToolCall | null): value is ToolCall =>
    value !== null,
  resolveToolCall = (call: RawToolCall): ToolCall | null => {
    const toolCall: ToolCall = {},
      argumentsValue = call.arguments,
      callId = resolveString(call.call_id),
      id = resolveString(call.id),
      name = resolveString(call.name),
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
      !toolCall.call_id &&
      !toolCall.id &&
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
    function: {
      arguments: entry.arguments,
      name: entry.name,
    },
    id: entry.callId,
    type: "function",
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
        arguments: getToolCallArguments(call),
        callId,
        name,
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
        plan.push({ includeToolCalls: true, index: i });
        hasUser = true;
        continue;
      }
      if (hasUser && message.role === "assistant" && hasTextContent(message)) {
        plan.push({ includeToolCalls: false, index: i });
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
      plan.push({ includeToolCalls: true, index: i });
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
    }),
  buildMessageIntermediates = (
    messages: MessageRecord[],
  ): MessageIntermediate[] => {
    const contextMessages = buildContextMessages(normalizeMessages(messages)),
      { removeToolCallIds, trimToolResponseIds } =
        collectPageReadDedupeSets(contextMessages),
      intermediates: MessageIntermediate[] = [];

    contextMessages.forEach((message) => {
      if (message.role === "tool") {
        const callId = message.tool_call_id;
        if (!callId) {
          throw new Error("工具响应缺少 tool_call_id");
        }
        if (removeToolCallIds.has(callId)) {
          return;
        }
        intermediates.push({
          callId,
          content: getToolOutputContent(message, trimToolResponseIds),
          kind: "toolResult",
        });
        return;
      }

      const role = message.role;
      if (typeof role !== "string" || role.length === 0) {
        return;
      }

      intermediates.push({
        content: typeof message.content === "string" ? message.content : "",
        kind: "conversation",
        role,
        toolCallEntries: collectToolCallEntries(
          message.tool_calls,
          removeToolCallIds,
        ),
      });
    });

    return intermediates;
  },
  mapMessageIntermediates = <TOutput>(
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
    mapMessageIntermediates(buildMessageIntermediates(messages), mapper),
  mapMessageIntermediateToChat = (
    message: MessageIntermediate,
  ): ChatRequestMessage[] => {
    if (message.kind === "toolResult") {
      return [
        {
          content: message.content,
          role: "tool",
          tool_call_id: message.callId,
        },
      ];
    }

    const entry: ChatRequestMessage = { role: message.role };
    if (message.content.length > 0) {
      entry.content = message.content;
    }
    if (message.toolCallEntries.length > 0) {
      entry.tool_calls = message.toolCallEntries.map(toChatToolCallForRequest);
    }
    if (entry.content || (entry.tool_calls && entry.tool_calls.length > 0)) {
      return [entry];
    }
    return [];
  },
  mapMessageIntermediateToResponses = (
    message: MessageIntermediate,
  ): ResponsesInputItem[] => {
    if (message.kind === "toolResult") {
      return [
        {
          call_id: message.callId,
          output: message.content,
          type: "function_call_output",
        },
      ];
    }
    if (message.role !== "user" && message.role !== "assistant") {
      return [];
    }
    const output: ResponsesInputItem[] = [];
    if (message.content.length > 0) {
      output.push({
        content: message.content,
        role: message.role,
      });
    }
    message.toolCallEntries.forEach((entry) => {
      output.push({
        arguments: entry.arguments,
        call_id: entry.callId,
        name: entry.name,
        type: "function_call",
      });
    });
    return output;
  },
  resolveAnthropicToolInput = (entry: ToolCallEntry): JsonObject => {
    if (typeof entry.arguments === "string") {
      try {
        const parsed = parseJson(entry.arguments);
        if (isJsonObject(parsed)) {
          return { ...parsed };
        }
        console.error("工具参数必须是对象或对象字符串", {
          arguments: entry.arguments,
          name: entry.name,
        });
        return {};
      } catch (error) {
        console.error("Failed to parse tool arguments", error);
        return {};
      }
    }
    if (isJsonObject(entry.arguments)) {
      return { ...entry.arguments };
    }
    console.error("工具参数必须是对象或对象字符串", {
      arguments: entry.arguments,
      name: entry.name,
    });
    return {};
  },
  mapMessageIntermediateToAnthropic = (
    message: MessageIntermediate,
  ): AnthropicMessageParam[] => {
    if (message.kind === "toolResult") {
      return [
        {
          content: [
            {
              content: message.content,
              tool_use_id: message.callId,
              type: "tool_result",
            },
          ],
          role: "user",
        },
      ];
    }

    if (message.role !== "user" && message.role !== "assistant") {
      return [];
    }

    const content: Exclude<AnthropicMessageParam["content"], string> = [];
    if (message.content.trim()) {
      content.push({ type: "text", text: message.content });
    }

    message.toolCallEntries.forEach((entry) => {
      content.push({
        id: entry.callId,
        input: resolveAnthropicToolInput(entry),
        name: entry.name,
        type: "tool_use",
      });
    });

    if (content.length === 0) {
      return [];
    }

    if (content.length === 1 && content[0].type === "text") {
      return [{ content: content[0].text, role: message.role }];
    }

    return [{ content, role: message.role }];
  },
  mergeAnthropicMessages = (
    messages: AnthropicMessageParam[],
  ): AnthropicMessageParam[] => {
    const merged: AnthropicMessageParam[] = [];
    messages.forEach((message) => {
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        if (last.role === message.role) {
          if (Array.isArray(last.content) && Array.isArray(message.content)) {
            last.content.push(...message.content);
          } else if (Array.isArray(last.content)) {
            if (typeof message.content === "string") {
              last.content.push({ type: "text", text: message.content });
            }
          } else if (Array.isArray(message.content)) {
            last.content = [
              { type: "text", text: last.content },
              ...message.content,
            ];
          } else {
            last.content = last.content + "\n\n" + message.content;
          }
          return;
        }
      }
      merged.push(message);
    });
    return merged;
  };

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
