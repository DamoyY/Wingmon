import {
  buildCodexResponsesHeaders,
  extractCodexAuthProfile,
  getCodexTokens,
} from "../../../shared/index.ts";
import OpenAI from "openai";
import type { Settings } from "../../services/index.ts";
import { normalizeClientBaseUrl } from "../clients.ts";
import { HttpStatusError } from "./statusCode.ts";

const codexResponsesPath = "/responses";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const withCodexRequestDefaults = (body: object): Record<string, unknown> => ({
  ...body,
  store: false,
});

const resolveCodexHeaders = async ({
  accept,
  accessToken,
}: {
  accept: string;
  accessToken: string;
}): Promise<Record<string, string>> => {
  const codexHeaders = await buildCodexResponsesHeaders(),
    savedTokens = await getCodexTokens();
  if (savedTokens !== null && savedTokens.access_token === accessToken) {
    const profile = extractCodexAuthProfile(savedTokens);
    if (profile.chatgptAccountId.trim()) {
      codexHeaders["chatgpt-account-id"] = profile.chatgptAccountId.trim();
    }
  }
  return {
    Accept: accept,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...codexHeaders,
  };
};

const readResponseText = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch (error) {
    console.error("读取响应文本失败", error);
    throw new Error("读取响应文本失败");
  }
};

const parseJsonText = (jsonText: string): unknown => {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("响应 JSON 解析失败", error);
    throw new Error("响应 JSON 解析失败");
  }
};

const parseCodexResponse = (jsonText: string): OpenAI.Responses.Response => {
  const parsed = parseJsonText(jsonText);
  if (!isObjectRecord(parsed)) {
    throw new Error("Codex 非流式响应格式无效");
  }
  return parsed as OpenAI.Responses.Response;
};

const parseCodexStreamEvent = (
  payload: string,
): OpenAI.Responses.ResponseStreamEvent => {
  const parsed = parseJsonText(payload);
  if (!isObjectRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error("Codex SSE 事件格式无效");
  }
  return parsed as OpenAI.Responses.ResponseStreamEvent;
};

const postCodexResponses = async ({
  accessToken,
  accept,
  baseUrl,
  body,
  signal,
}: {
  accessToken: string;
  accept: string;
  baseUrl: string;
  body: object;
  signal: AbortSignal;
}): Promise<Response> => {
  const response = await fetch(
    `${normalizeClientBaseUrl(baseUrl)}${codexResponsesPath}`,
    {
      body: JSON.stringify(withCodexRequestDefaults(body)),
      headers: await resolveCodexHeaders({ accessToken, accept }),
      method: "POST",
      signal,
    },
  );
  if (response.ok) {
    return response;
  }
  const errorBody = await readResponseText(response);
  const normalizedBody = errorBody.trim() || "no body";
  throw new HttpStatusError(
    response.status,
    `${String(response.status)} status code (${normalizedBody})`,
  );
};

const extractSsePayload = (block: string): string => {
  const payloadLines: string[] = [];
  block.split(/\r?\n/gu).forEach((line) => {
    if (line.startsWith("data:")) {
      payloadLines.push(line.slice(5).trim());
    }
  });
  return payloadLines.join("\n");
};

const parseSseEvent = (
  payload: string,
): OpenAI.Responses.ResponseStreamEvent => {
  try {
    return parseCodexStreamEvent(payload);
  } catch (error: unknown) {
    console.error("Codex SSE 事件解析失败", { error, payload });
    throw new Error("Codex SSE 事件解析失败");
  }
};

const findSseBoundary = (
  text: string,
): { index: number; length: number } | null => {
  const crlfBoundaryIndex = text.indexOf("\r\n\r\n");
  const lfBoundaryIndex = text.indexOf("\n\n");
  if (crlfBoundaryIndex < 0 && lfBoundaryIndex < 0) {
    return null;
  }
  if (
    crlfBoundaryIndex >= 0 &&
    (lfBoundaryIndex < 0 || crlfBoundaryIndex < lfBoundaryIndex)
  ) {
    return { index: crlfBoundaryIndex, length: "\r\n\r\n".length };
  }
  return { index: lfBoundaryIndex, length: "\n\n".length };
};

const consumeSseBuffer = (
  buffer: string,
): { events: OpenAI.Responses.ResponseStreamEvent[]; rest: string } => {
  const events: OpenAI.Responses.ResponseStreamEvent[] = [];
  let rest = buffer;
  for (;;) {
    const boundary = findSseBoundary(rest);
    if (boundary === null) {
      break;
    }
    const block = rest.slice(0, boundary.index);
    rest = rest.slice(boundary.index + boundary.length);
    const payload = extractSsePayload(block);
    if (!payload || payload === "[DONE]") {
      continue;
    }
    events.push(parseSseEvent(payload));
  }
  return { events, rest };
};

const iterateCodexSseEvents = async function* ({
  response,
}: {
  response: Response;
}): AsyncIterable<OpenAI.Responses.ResponseStreamEvent> {
  if (response.body === null) {
    throw new Error("Codex 流式响应为空");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    buffer += decoder.decode(chunk.value, { stream: true });
    const consumed = consumeSseBuffer(buffer);
    buffer = consumed.rest;
    for (const event of consumed.events) {
      yield event;
    }
  }
  const tail = buffer.trim();
  if (!tail) {
    return;
  }
  const payload = extractSsePayload(tail);
  if (!payload || payload === "[DONE]") {
    return;
  }
  yield parseSseEvent(payload);
};

export const codexResponsesApiCall = async (
  settings: Settings,
  body: unknown,
  signal: AbortSignal,
): Promise<
  | AsyncIterable<OpenAI.Responses.ResponseStreamEvent>
  | OpenAI.Responses.Response
> => {
  if (!isObjectRecord(body)) {
    throw new Error("Codex 请求体格式无效");
  }
  const isStream = body.stream === true;
  const response = await postCodexResponses({
    accept: isStream ? "text/event-stream" : "application/json",
    accessToken: settings.apiKey,
    baseUrl: settings.baseUrl,
    body,
    signal,
  });
  if (isStream) {
    return iterateCodexSseEvents({ response });
  }
  const responseText = await readResponseText(response);
  if (!responseText.trim()) {
    throw new Error("Codex 非流式响应为空");
  }
  return parseCodexResponse(responseText);
};
