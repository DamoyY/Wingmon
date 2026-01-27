import {
  buildChatMessages,
  buildResponsesInput,
} from "../tools/message-builders.js";
import {
  addChatToolCallDelta,
  finalizeChatToolCalls,
  addResponsesToolCallEvent,
  finalizeResponsesToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
} from "../tools/toolcalls.js";
import {
  streamChatCompletion,
  streamResponses,
  extractResponsesText,
} from "./sse.js";

const apiStrategies = {
  chat: {
    buildRequestBody: (settings, systemPrompt, tools) => ({
      model: settings.model,
      messages: buildChatMessages(systemPrompt),
      stream: true,
      tools,
    }),
    stream: async (response, { onDelta }) => {
      let collector = {};
      await streamChatCompletion(response, {
        onDelta,
        onToolCallDelta: (deltas) => {
          collector = addChatToolCallDelta(collector, deltas);
        },
      });
      return finalizeChatToolCalls(collector);
    },
    extractToolCalls: (data) => extractChatToolCalls(data),
    extractReply: (data) => data?.choices?.[0]?.message?.content?.trim(),
  },
  responses: {
    buildRequestBody: (settings, systemPrompt, tools) => ({
      model: settings.model,
      input: buildResponsesInput(),
      stream: true,
      tools,
      ...(systemPrompt ? { instructions: systemPrompt } : {}),
    }),
    stream: async (response, { onDelta }) => {
      let collector = {};
      await streamResponses(response, {
        onDelta,
        onToolCallEvent: (payload, eventType) => {
          collector = addResponsesToolCallEvent(collector, payload, eventType);
        },
      });
      return finalizeResponsesToolCalls(collector);
    },
    extractToolCalls: (data) => extractResponsesToolCalls(data),
    extractReply: (data) => extractResponsesText(data),
  },
};
const getApiStrategy = (apiType) => {
  const strategy = apiStrategies[apiType];
  if (!strategy) {
    throw new Error(`不支持的 API 类型: ${apiType}`);
  }
  return strategy;
};
export default getApiStrategy;
