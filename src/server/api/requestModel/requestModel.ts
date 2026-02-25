import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createAnthropicClient, createOpenAIClient } from "../clients.ts";
import { codexResponsesApiCall } from "./codexResponses.ts";
import {
  type ChatResponse,
  type ChatStream,
  executeRequest,
  type MessagesResponse,
  type MessagesStream,
  type ResponsesResponse,
  type ResponsesStream,
} from "./genericRequest.ts";
import { executeGeminiRequest } from "./geminiRequest.ts";
import type { RequestModelPayload, RequestModelResult } from "./types.ts";

const executeMessagesRequest = (
  payload: RequestModelPayload,
): Promise<RequestModelResult> => {
  const client = createAnthropicClient(payload.settings);
  return executeRequest<MessagesStream, MessagesResponse>(
    payload,
    (body, options) =>
      client.messages.create(
        body as Anthropic.Messages.MessageCreateParamsStreaming,
        options,
      ),
    "messages",
  );
};

const executeCodexRequest = (
  payload: RequestModelPayload,
): Promise<RequestModelResult> =>
  executeRequest<ResponsesStream, ResponsesResponse>(
    payload,
    (body, options) =>
      codexResponsesApiCall(payload.settings, body, options.signal),
    "codex.responses",
  );

const executeChatRequest = (
  payload: RequestModelPayload,
  client: OpenAI,
): Promise<RequestModelResult> =>
  executeRequest<ChatStream, ChatResponse>(
    payload,
    (body, options) =>
      client.chat.completions.create(
        body as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
        options,
      ),
    "chat",
  );

const executeResponsesRequest = (
  payload: RequestModelPayload,
  client: OpenAI,
): Promise<RequestModelResult> =>
  executeRequest<ResponsesStream, ResponsesResponse>(
    payload,
    (body, options) =>
      client.responses.create(
        body as OpenAI.Responses.ResponseCreateParamsStreaming,
        options,
      ),
    "responses",
  );

const requestModel = async (
  payload: RequestModelPayload,
): Promise<RequestModelResult> => {
  const { apiType } = payload.settings;

  if (apiType === "gemini") {
    return executeGeminiRequest(payload);
  }
  if (apiType === "messages") {
    return executeMessagesRequest(payload);
  }
  if (apiType === "codex") {
    return executeCodexRequest(payload);
  }

  const client = createOpenAIClient(payload.settings);
  if (apiType === "chat") {
    return executeChatRequest(payload, client);
  }
  return executeResponsesRequest(payload, client);
};

export default requestModel;
