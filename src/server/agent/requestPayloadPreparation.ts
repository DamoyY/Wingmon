import type {
  ContextPlanItem,
  MessageFieldValue,
  MessageIntermediate,
  NormalizedMessage,
  RawToolCall,
  ToolCallEntry,
} from "./requestPayloadTypes.ts";
import {
  type RawToolCall as NormalizedRawToolCall,
  type ToolCall,
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  normalizeToolCall,
} from "./definitions.ts";
import {
  type ToolImageInput,
  isSupportedPageImageMimeType,
} from "./toolResultTypes.ts";
import {
  collectPageReadDedupeSets,
  getToolOutputContent,
} from "./toolMessageContext.ts";
import {
  ensureMessageRecord,
  isRecord,
  resolveString,
} from "../../shared/index.ts";
import type { MessageRecord } from "../../shared/state/panelStateContext.ts";

const isToolCall = (value: ToolCall | null): value is ToolCall =>
    value !== null,
  resolveToolCall = (call: RawToolCall): ToolCall | null => {
    const argumentsValue = call.arguments,
      callId = resolveString(call.call_id),
      id = resolveString(call.id),
      name = resolveString(call.name),
      thoughtSignature = resolveString(call.thought_signature),
      functionValue = call.function,
      topLevelArguments =
        typeof argumentsValue === "string" ? argumentsValue : undefined;
    let functionPart: { arguments: string; name: string } | undefined;
    if (isRecord(functionValue)) {
      const functionName = resolveString(functionValue.name),
        functionArguments = functionValue.arguments,
        hasFunctionName = functionName.length > 0;
      if (hasFunctionName && typeof functionArguments === "string") {
        functionPart = {
          arguments: functionArguments,
          name: functionName,
        };
      }
    }
    if (!callId && !id && !name && functionPart === undefined) {
      return null;
    }
    const rawToolCall: NormalizedRawToolCall = {
      ...(topLevelArguments === undefined
        ? {}
        : { arguments: topLevelArguments }),
      ...(callId ? { call_id: callId } : {}),
      ...(functionPart === undefined ? {} : { function: functionPart }),
      ...(id ? { id } : {}),
      ...(name ? { name } : {}),
      ...(thoughtSignature ? { thought_signature: thoughtSignature } : {}),
    };
    return normalizeToolCall(rawToolCall);
  },
  normalizeMessage = (message: MessageRecord): NormalizedMessage => {
    const validated = ensureMessageRecord(message, "消息");
    const normalized: NormalizedMessage = {
      content: validated.content,
      role: validated.role,
      tool_calls: [],
    };
    if (validated.tool_call_id) {
      normalized.tool_call_id = validated.tool_call_id;
    }
    if (validated.name) {
      normalized.name = validated.name;
    }
    if (Array.isArray(validated.tool_calls)) {
      normalized.tool_calls = validated.tool_calls
        .map(resolveToolCall)
        .filter(isToolCall);
    }
    if (validated.toolContext !== undefined) {
      normalized.toolContext = validated.toolContext;
    }
    return normalized;
  },
  normalizeMessages = (messages: MessageRecord[]): NormalizedMessage[] =>
    messages.map(normalizeMessage),
  collectToolCallEntries = (
    toolCalls: ToolCall[],
    removeToolCallIds: Set<string>,
  ): ToolCallEntry[] => {
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
        thoughtSignature: call.thought_signature,
      });
    });
    return entries;
  },
  resolveToolImageInputFromContext = (
    toolContext: MessageFieldValue | undefined,
  ): ToolImageInput | undefined => {
    if (!isRecord(toolContext)) {
      return undefined;
    }
    if (!Object.hasOwn(toolContext, "imageInput")) {
      return undefined;
    }
    const imageInputValue = toolContext.imageInput;
    if (!isRecord(imageInputValue)) {
      throw new Error("toolContext.imageInput 无效");
    }
    const mimeTypeValue = imageInputValue.mimeType;
    if (typeof mimeTypeValue !== "string") {
      throw new Error("toolContext.imageInput.mimeType 无效");
    }
    if (!isSupportedPageImageMimeType(mimeTypeValue)) {
      throw new Error("toolContext.imageInput.mimeType 不受支持");
    }
    const sourceType = imageInputValue.sourceType;
    if (sourceType === "url") {
      const urlValue = imageInputValue.url;
      if (typeof urlValue !== "string" || !urlValue.trim()) {
        throw new Error("toolContext.imageInput.url 无效");
      }
      return {
        mimeType: mimeTypeValue,
        sourceType: "url",
        url: urlValue,
      };
    }
    if (sourceType === "base64") {
      const dataValue = imageInputValue.data;
      if (typeof dataValue !== "string" || !dataValue.trim()) {
        throw new Error("toolContext.imageInput.data 无效");
      }
      return {
        data: dataValue,
        mimeType: mimeTypeValue,
        sourceType: "base64",
      };
    }
    throw new Error("toolContext.imageInput.sourceType 无效");
  },
  hasTextContent = (message: NormalizedMessage): boolean =>
    message.content.trim().length > 0,
  collectUserMessageIndices = (messages: NormalizedMessage[]): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < messages.length; i += 1) {
      if (messages[i]?.role === "user") {
        indices.push(i);
      }
    }
    return indices;
  },
  resolveBoundaryUserMessageIndex = (messages: NormalizedMessage[]): number => {
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
  stripToolCalls = (message: NormalizedMessage): NormalizedMessage => {
    if (message.tool_calls.length === 0) {
      return message;
    }
    return {
      ...message,
      tool_calls: [],
    };
  },
  buildHistoryPlan = (
    messages: NormalizedMessage[],
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
  buildContextPlan = (messages: NormalizedMessage[]): ContextPlanItem[] => {
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
  buildContextMessages = (messages: NormalizedMessage[]): NormalizedMessage[] =>
    buildContextPlan(messages).map(({ includeToolCalls, index }) => {
      const message = messages[index];
      return includeToolCalls ? message : stripToolCalls(message);
    });

export const buildMessageIntermediates = (
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
      const imageInput = resolveToolImageInputFromContext(message.toolContext);
      intermediates.push({
        callId,
        content: getToolOutputContent(message, trimToolResponseIds),
        ...(imageInput === undefined ? {} : { imageInput }),
        kind: "toolResult",
        ...(message.name && message.name.length > 0
          ? { name: message.name }
          : {}),
      });
      return;
    }

    const role = message.role.trim();
    if (!role) {
      return;
    }

    intermediates.push({
      content: message.content,
      kind: "conversation",
      role,
      toolCallEntries: collectToolCallEntries(
        message.tool_calls,
        removeToolCallIds,
      ),
    });
  });

  return intermediates;
};
