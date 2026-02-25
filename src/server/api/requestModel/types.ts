import type { ToolCall, ToolDefinition } from "../../agent/definitions.ts";
import type { MessageRecord } from "../../../shared/state/panelStateContext.ts";
import type { Settings } from "../../services/index.ts";
import type { ApiRequestChunk } from "../strategies.ts";

export type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  messages: MessageRecord[];
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  onChunk: (chunk: ApiRequestChunk) => void;
  signal: AbortSignal;
};

export type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
};

export type StreamRetryTracker = {
  chunkCount: number;
  streamStarted: boolean;
};
