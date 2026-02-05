import {
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
} from "./toolCallNormalization.js";
import { buildChatMessages, buildResponsesInput } from "./message-builders.js";

const apiToolAdapter = Object.freeze({
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  buildChatMessages,
  buildResponsesInput,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
});

export default apiToolAdapter;
