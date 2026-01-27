import { state, addMessage, updateMessage } from "../state/store";

const normalizeToolCall = ({
  id,
  callId,
  name,
  argumentsText,
  defaultArguments,
}) => {
  if (!name) {
    return null;
  }
  const resolvedId = callId || id;
  const resolvedArguments =
    typeof argumentsText === "string" ? argumentsText : defaultArguments;
  return {
    id: resolvedId,
    type: "function",
    function: { name, arguments: resolvedArguments },
    call_id: resolvedId,
  };
};
const normalizeToolCallList = (items, mapper) =>
  items.map((item) => normalizeToolCall(mapper(item))).filter(Boolean);
export const addChatToolCallDelta = (collector, deltas) => {
  deltas.forEach((delta) => {
    const index = typeof delta.index === "number" ? delta.index : 0;
    if (!collector[index]) {
      collector[index] = {
        id: delta.id,
        type: delta.type || "function",
        function: { name: delta.function?.name || "", arguments: "" },
      };
    }
    if (delta.id) {
      collector[index].id = delta.id;
    }
    if (delta.type) {
      collector[index].type = delta.type;
    }
    if (delta.function?.name) {
      collector[index].function.name = delta.function.name;
    }
    if (typeof delta.function?.arguments === "string") {
      collector[index].function.arguments += delta.function.arguments;
    }
  });
};
export const finalizeChatToolCalls = (collector) =>
  normalizeToolCallList(Object.values(collector), (call) => ({
    id: call.id,
    callId: call.call_id,
    name: call.function?.name,
    argumentsText: call.function?.arguments,
  }));
export const addResponsesToolCallEvent = (collector, payload, eventType) => {
  const resolvedType = payload?.type || eventType;
  if (resolvedType === "response.output_item.added") {
    if (payload?.item?.type === "function_call") {
      collector[payload.output_index] = { ...payload.item };
    }
    return;
  }
  if (resolvedType === "response.output_item.done") {
    if (payload?.item?.type === "function_call") {
      collector[payload.output_index] = { ...payload.item };
    }
    return;
  }
  if (resolvedType === "response.function_call_arguments.delta") {
    const index = payload?.output_index;
    if (typeof index !== "number" || !collector[index]) {
      return;
    }
    collector[index].arguments =
      `${collector[index].arguments || ""}${payload.delta || ""}`;
    return;
  }
  if (resolvedType === "response.function_call_arguments.done") {
    const index = payload?.output_index;
    if (typeof index !== "number" || !collector[index]) {
      return;
    }
    if (typeof payload.arguments === "string") {
      collector[index].arguments = payload.arguments;
    }
  }
};
export const finalizeResponsesToolCalls = (collector) =>
  normalizeToolCallList(Object.values(collector), (call) => ({
    id: call.id,
    callId: call.call_id,
    name: call?.name,
    argumentsText: call.arguments,
    defaultArguments: "",
  }));
export const extractChatToolCalls = (data) => {
  const message = data?.choices?.[0]?.message;
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
    const call = message.function_call;
    return normalizeToolCallList([call], () => ({
      id: message.id || call.name,
      callId: message.id || call.name,
      name: call.name,
      argumentsText: call.arguments,
      defaultArguments: "",
    }));
  }
  return [];
};
export const extractResponsesToolCalls = (data) => {
  const output = Array.isArray(data?.output) ? data.output : [];
  return normalizeToolCallList(
    output.filter((item) => item?.type === "function_call"),
    (item) => ({
      id: item.id,
      callId: item.call_id,
      name: item.name,
      argumentsText: item.arguments,
      defaultArguments: "",
    }),
  );
};
export const attachToolCallsToAssistant = (toolCalls, assistantIndex) => {
  if (!toolCalls.length) {
    return;
  }
  const index =
    typeof assistantIndex === "number"
      ? assistantIndex
      : state.messages.length - 1;
  const target = state.messages[index];
  if (target && target.role === "assistant") {
    updateMessage(index, { tool_calls: toolCalls });
    return;
  }
  addMessage({ role: "assistant", content: "", tool_calls: toolCalls });
};
