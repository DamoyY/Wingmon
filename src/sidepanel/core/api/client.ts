import { buildEndpoint } from "../services/index.ts";
import { parseJson, type JsonValue } from "../../lib/utils/index.ts";
import getApiStrategy, {
  type ApiRequestBody,
  type ApiRequestChunk,
  type ApiToolAdapter,
} from "./strategies.ts";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import type { MessageRecord } from "../store/index.ts";
import type { Settings } from "../services/index.ts";

type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolAdapter: ApiToolAdapter;
  messages: MessageRecord[];
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  onChunk: (chunk: ApiRequestChunk) => void;
  signal: AbortSignal;
};

type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
};

type RequestWithRetryPayload = {
  endpoint: string;
  apiKey: string;
  payload: string;
  signal: AbortSignal;
};

class ApiResponseError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
  }
}

const apiRetryTimeoutMs = 60000,
  apiRetryBaseDelayMs = 500,
  normalizeError = (error: unknown): Error => {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === "string" && error.trim()) {
      return new Error(error);
    }
    return new Error("请求失败");
  },
  createAbortError = (): Error => {
    const abortError = new Error("请求已取消");
    abortError.name = "AbortError";
    return abortError;
  },
  isAbortError = (error: unknown): boolean =>
    error instanceof Error && error.name === "AbortError",
  waitForDelay = (delayMs: number, signal: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(createAbortError());
        return;
      }
      const onAbort = (): void => {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          reject(createAbortError());
        },
        timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
      signal.addEventListener("abort", onAbort, { once: true });
    }),
  resolveRetryDelay = (attemptIndex: number): number =>
    apiRetryBaseDelayMs * 2 ** attemptIndex,
  extractStatusCode = (error: unknown): number | null => {
    if (error instanceof ApiResponseError) {
      return error.status;
    }
    return null;
  },
  createApiResponseError = async (response: Response): Promise<Error> => {
    const responseText = (await response.text()).trim(),
      fallbackMessage =
        `${String(response.status)} ${response.statusText || "请求失败"}`.trim(),
      message = responseText || fallbackMessage;
    return new ApiResponseError(message, response.status);
  },
  requestWithRetry = async ({
    endpoint,
    apiKey,
    payload,
    signal,
  }: RequestWithRetryPayload): Promise<Response> => {
    const startedAt = Date.now();
    let attemptIndex = 0;
    for (;;) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: payload,
          signal,
        });
        if (!response.ok) {
          throw await createApiResponseError(response);
        }
        return response;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        const failure = normalizeError(error),
          elapsedMs = Date.now() - startedAt,
          remainingMs = apiRetryTimeoutMs - elapsedMs,
          statusCode = extractStatusCode(error),
          attemptsMade = attemptIndex + 1;
        if (remainingMs <= 0) {
          console.error("API 请求失败，已达到重试时限", {
            attemptsMade,
            elapsedMs,
            statusCode,
            message: failure.message,
          });
          throw failure;
        }
        const delayMs = Math.min(resolveRetryDelay(attemptIndex), remainingMs);
        console.warn("API 请求失败，准备指数退避重试", {
          attemptsMade,
          delayMs,
          elapsedMs,
          statusCode,
          message: failure.message,
        });
        await waitForDelay(delayMs, signal);
        attemptIndex += 1;
      }
    }
  },
  parseResponseData = (rawText: string): JsonValue => {
    if (!rawText.trim()) {
      throw new Error("API 响应为空");
    }
    return parseJson(rawText);
  };

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
}: RequestModelPayload): Promise<RequestModelResult> => {
  const strategy = getApiStrategy(settings.apiType, toolAdapter),
    requestBody: ApiRequestBody = strategy.buildRequestBody(
      settings,
      systemPrompt,
      tools,
      messages,
    ),
    response = await requestWithRetry({
      endpoint: buildEndpoint(settings.baseUrl, settings.apiType),
      apiKey: settings.apiKey,
      payload: JSON.stringify(requestBody),
      signal,
    });
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    if (typeof onStreamStart === "function") {
      onStreamStart();
    }
    const toolCalls = await strategy.stream(response, { onDelta, onChunk });
    return { toolCalls, reply: "", streamed: true };
  }
  const data = parseResponseData(await response.text()),
    toolCalls = strategy.extractToolCalls(data),
    reply = strategy.extractReply(data);
  return {
    toolCalls,
    reply: typeof reply === "string" ? reply : "",
    streamed: false,
  };
};
export default requestModel;
