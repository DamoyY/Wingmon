import { buildSystemPrompt } from "../../../services/index.js";
import {
  apiToolAdapter,
  getToolDefinitions,
  handleToolCalls,
} from "../../../tools/index.js";
import { requestModel } from "../../../api/index.js";
import { addMessage, state } from "../../../state/index.js";
import { appendAssistantDelta, renderMessagesView } from "./presenter.js";

const ensureNotAborted = (signal) => {
  if (signal?.aborted) {
    throw new Error("已停止");
  }
};

const ensureStatusReporter = (reporter) => {
  if (typeof reporter !== "function") {
    throw new Error("状态回调无效");
  }
  return reporter;
};

const normalizeToolCalls = (toolCalls) =>
  Array.isArray(toolCalls) ? toolCalls : [];

const createResponseStream = async function* createResponseStream({
  settings,
  signal,
  onStatus,
}) {
  const reportStatus = ensureStatusReporter(onStatus);
  const requestNext = async function* requestNext() {
    ensureNotAborted(signal);
    let assistantIndex = null;
    const onStreamStart = () => {
      assistantIndex = state.messages.length;
      addMessage({ role: "assistant", content: "" });
      renderMessagesView();
      reportStatus("回复中…");
    };
    const systemPrompt = await buildSystemPrompt();
    const tools = getToolDefinitions(settings.apiType);
    const { toolCalls, reply, streamed } = await requestModel({
      settings,
      systemPrompt,
      tools,
      toolAdapter: apiToolAdapter,
      onDelta: appendAssistantDelta,
      onStreamStart,
      signal,
    });
    const pendingToolCalls = normalizeToolCalls(toolCalls);
    yield {
      toolCalls: pendingToolCalls,
      reply,
      streamed,
      assistantIndex,
    };
    if (!pendingToolCalls.length) {
      return;
    }
    const toolMessages = await handleToolCalls(pendingToolCalls);
    toolMessages.forEach((message) => addMessage(message));
    ensureNotAborted(signal);
    reportStatus("请求中…");
    yield* requestNext();
  };
  yield* requestNext();
};

export default createResponseStream;
