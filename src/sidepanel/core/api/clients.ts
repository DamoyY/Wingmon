import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { Settings } from "../services/index.ts";
import { apiRetryTimeoutMs } from "./request-utils.ts";

const endpointSuffixes = ["/chat/completions", "/responses", "/v1/messages"];

export const normalizeClientBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim();
  if (!trimmed) throw new Error("Base URL 不能为空");
  const normalized = trimmed.replace(/\/+$/, "");
  for (const suffix of endpointSuffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized.slice(0, -suffix.length);
    }
  }
  return normalized;
};

export function createOpenAIClient(settings: Settings): OpenAI {
  return new OpenAI({
    apiKey: settings.apiKey,
    baseURL: normalizeClientBaseUrl(settings.baseUrl),
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    timeout: apiRetryTimeoutMs,
  });
}

export function createAnthropicClient(settings: Settings): Anthropic {
  return new Anthropic({
    apiKey: settings.apiKey,
    baseURL: normalizeClientBaseUrl(settings.baseUrl),
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    timeout: apiRetryTimeoutMs,
  });
}
