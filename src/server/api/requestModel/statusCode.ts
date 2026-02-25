import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "@google/genai";
import OpenAI from "openai";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractNumericStatus = (value: unknown): number | null => {
  if (!isObjectRecord(value)) {
    return null;
  }
  const { status } = value;
  return typeof status === "number" ? status : null;
};

export class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

export const extractStatusCode = (error: unknown): number | null => {
  if (error instanceof HttpStatusError) {
    return error.status;
  }
  if (error instanceof OpenAI.APIError) {
    return extractNumericStatus(error);
  }
  if (error instanceof Anthropic.APIError) {
    return extractNumericStatus(error);
  }
  if (error instanceof ApiError) {
    return typeof error.status === "number" ? error.status : null;
  }
  return null;
};
