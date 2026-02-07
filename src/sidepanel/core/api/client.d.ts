import type { Settings } from "../services/index.ts";
import type { ToolCall, ToolDefinition } from "../agent/definitions.ts";
import type { MessageRecord } from "../store/index.ts";
import type {
  buildChatMessages,
  buildResponsesInput,
} from "../agent/message-builders.ts";
import type {
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
} from "../agent/toolCallNormalization.ts";

type RequestChunk = {
  delta: string;
  toolCalls: ToolCall[];
};

type ApiToolAdapter = {
  addChatToolCallDelta: typeof addChatToolCallDelta;
  addResponsesToolCallEvent: typeof addResponsesToolCallEvent;
  buildChatMessages: typeof buildChatMessages;
  buildResponsesInput: typeof buildResponsesInput;
  extractChatToolCalls: typeof extractChatToolCalls;
  extractResponsesToolCalls: typeof extractResponsesToolCalls;
  finalizeChatToolCalls: typeof finalizeChatToolCalls;
  finalizeResponsesToolCalls: typeof finalizeResponsesToolCalls;
};

type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolAdapter: ApiToolAdapter;
  messages: MessageRecord[];
  onDelta: (delta: string) => void;
  onStreamStart: () => void;
  onChunk: (chunk: RequestChunk) => void;
  signal: AbortSignal;
};

type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
};

declare const requestModel: (
  payload: RequestModelPayload,
) => Promise<RequestModelResult>;

export default requestModel;
