import { buildEndpoint } from "../services/index.ts";
import getApiStrategy from "./strategies.js";

const requestModel = async ({
  settings,
  systemPrompt,
  tools,
  toolAdapter,
  messages,
  onDelta,
  onStreamStart,
  onChunk,
  signal,
}) => {
  const strategy = getApiStrategy(settings.apiType, toolAdapter),
    requestBody = strategy.buildRequestBody(
      settings,
      systemPrompt,
      tools,
      messages,
    ),
    response = await fetch(buildEndpoint(settings.baseUrl, settings.apiType), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "请求失败");
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    if (typeof onStreamStart === "function") {
      onStreamStart();
    }
    const toolCalls = await strategy.stream(response, { onDelta, onChunk });
    return { toolCalls, streamed: true };
  }
  const data = await response.json(),
    toolCalls = strategy.extractToolCalls(data),
    reply = strategy.extractReply(data);
  return { toolCalls, reply, streamed: false };
};
export default requestModel;
