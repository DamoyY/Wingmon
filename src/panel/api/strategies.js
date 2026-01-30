import {
  streamChatCompletion,
  streamResponses,
  extractResponsesText,
} from "./sse.js";

const requiredToolAdapterKeys = [
  "addChatToolCallDelta",
  "addResponsesToolCallEvent",
  "buildChatMessages",
  "buildResponsesInput",
  "extractChatToolCalls",
  "extractResponsesToolCalls",
  "finalizeChatToolCalls",
  "finalizeResponsesToolCalls",
];

const ensureToolAdapter = (adapter) => {
  if (!adapter) {
    throw new Error("缺少工具适配器");
  }
  requiredToolAdapterKeys.forEach((key) => {
    if (typeof adapter[key] !== "function") {
      throw new Error(`工具适配器缺少方法：${key}`);
    }
  });
  return adapter;
};

const createApiStrategies = (toolAdapter) => ({
  chat: {
    buildRequestBody: (settings, systemPrompt, tools) => ({
      model: settings.model,
      messages: toolAdapter.buildChatMessages(systemPrompt),
      stream: true,
      tools,
    }),
    stream: async (response, { onDelta }) => {
      let collector = {};
      await streamChatCompletion(response, {
        onDelta,
        onToolCallDelta: (deltas) => {
          collector = toolAdapter.addChatToolCallDelta(collector, deltas);
        },
      });
      return toolAdapter.finalizeChatToolCalls(collector);
    },
    extractToolCalls: (data) => toolAdapter.extractChatToolCalls(data),
    extractReply: (data) => data?.choices?.[0]?.message?.content?.trim(),
  },
  responses: {
    buildRequestBody: (settings, systemPrompt, tools) => ({
      model: settings.model,
      input: toolAdapter.buildResponsesInput(),
      stream: true,
      tools,
      ...(systemPrompt ? { instructions: systemPrompt } : {}),
    }),
    stream: async (response, { onDelta }) => {
      let collector = {};
      await streamResponses(response, {
        onDelta,
        onToolCallEvent: (payload, eventType) => {
          collector = toolAdapter.addResponsesToolCallEvent(
            collector,
            payload,
            eventType,
          );
        },
      });
      return toolAdapter.finalizeResponsesToolCalls(collector);
    },
    extractToolCalls: (data) => toolAdapter.extractResponsesToolCalls(data),
    extractReply: (data) => extractResponsesText(data),
  },
});

const getApiStrategy = (apiType, toolAdapter) => {
  const resolvedAdapter = ensureToolAdapter(toolAdapter);
  const apiStrategies = createApiStrategies(resolvedAdapter);
  const strategy = apiStrategies[apiType];
  if (!strategy) {
    throw new Error(`不支持的 API 类型: ${apiType}`);
  }
  return strategy;
};
export default getApiStrategy;
