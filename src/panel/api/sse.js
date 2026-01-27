import parseJson from "../utils/json.js";

export const streamSse = async (response, onPayload) => {
  if (!response.body) {
    throw new Error("无法读取流式响应");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentEvent = "";
  let shouldStop = false;
  const handleLine = (line) => {
    if (shouldStop) {
      return;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      currentEvent = "";
      return;
    }
    if (trimmed.startsWith("event:")) {
      currentEvent = trimmed.replace(/^event:\s*/, "").trim();
      return;
    }
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const data = trimmed.replace(/^data:\s*/, "");
    if (data === "[DONE]") {
      shouldStop = true;
      return;
    }
    const payload = parseJson(data);
    if (payload?.error?.message) {
      throw new Error(payload.error.message);
    }
    onPayload(payload, currentEvent);
    currentEvent = "";
  };
  const readChunk = async () => {
    const { value, done } = await reader.read();
    if (done || shouldStop) {
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(handleLine);
    if (shouldStop) {
      return;
    }
    await readChunk();
  };
  await readChunk();
};
const deltaFromChat = (payload) =>
  payload?.choices?.[0]?.delta?.content ||
  payload?.choices?.[0]?.text ||
  payload?.choices?.[0]?.message?.content ||
  "";
const deltaFromResponses = (payload, eventType) => {
  const resolvedType = payload?.type || eventType;
  if (resolvedType === "response.output_text.delta") {
    return payload?.delta || payload?.text || "";
  }
  if (resolvedType === "response.refusal.delta") {
    return payload?.delta || "";
  }
  return deltaFromChat(payload);
};
export const streamChatCompletion = (response, { onDelta, onToolCallDelta }) =>
  streamSse(response, (payload) => {
    const delta = deltaFromChat(payload);
    if (delta) {
      onDelta(delta);
    }
    const toolCalls = payload?.choices?.[0]?.delta?.tool_calls;
    if (Array.isArray(toolCalls) && onToolCallDelta) {
      onToolCallDelta(toolCalls);
    }
  });
export const streamResponses = (response, { onDelta, onToolCallEvent }) =>
  streamSse(response, (payload, eventType) => {
    const delta = deltaFromResponses(payload, eventType);
    if (delta) {
      onDelta(delta);
    }
    if (onToolCallEvent) {
      onToolCallEvent(payload, eventType);
    }
  });
export const extractResponsesText = (data) => {
  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }
  const output = Array.isArray(data?.output) ? data.output : [];
  const texts = [];
  output.forEach((item) => {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      return;
    }
    item.content.forEach((part) => {
      if (part?.type === "output_text" && typeof part.text === "string") {
        texts.push(part.text);
      }
    });
  });
  return texts.join("").trim();
};
