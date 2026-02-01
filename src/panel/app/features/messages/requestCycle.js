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

const STATUS_TEXT = {
  thinking: "思索中...",
  searching: "搜索中...",
  browsing: "浏览中...",
  operating: "操作中...",
  coding: "编码中...",
  speaking: "表达中...",
  idle: "",
};

const TOOL_STATUS_MAP = {
  get_page: STATUS_TEXT.browsing,
  list_tabs: STATUS_TEXT.browsing,
  click_button: STATUS_TEXT.operating,
  close_page: STATUS_TEXT.operating,
  run_console: STATUS_TEXT.coding,
  show_html: STATUS_TEXT.coding,
};

const getToolCallName = (call) => call?.function?.name || call?.name || "";

const getToolCallArguments = (call) =>
  call?.function?.arguments || call?.arguments || "";

const isGoogleSearchOpen = (argsText) =>
  typeof argsText === "string" &&
  argsText.includes("https://www.google.com/search");

const resolveStatusFromToolCalls = (toolCalls) => {
  if (!Array.isArray(toolCalls) || !toolCalls.length) {
    return "";
  }
  for (let i = 0; i < toolCalls.length; i += 1) {
    const call = toolCalls[i];
    const name = getToolCallName(call);
    if (name) {
      if (name === "open_page") {
        const argsText = getToolCallArguments(call);
        if (isGoogleSearchOpen(argsText)) {
          return STATUS_TEXT.searching;
        }
        return STATUS_TEXT.browsing;
      }
      const mapped = TOOL_STATUS_MAP[name];
      if (mapped) {
        return mapped;
      }
    }
  }
  return "";
};

const resolveStatusFromChunk = ({ delta, toolCalls }) => {
  const toolStatus = resolveStatusFromToolCalls(toolCalls);
  if (toolStatus) {
    return toolStatus;
  }
  if (delta) {
    return STATUS_TEXT.speaking;
  }
  return "";
};

const createStatusTracker = (reportStatus) => {
  let lastStatus = STATUS_TEXT.idle;
  const setStatus = (nextStatus) => {
    const normalized = typeof nextStatus === "string" ? nextStatus : "";
    if (normalized === lastStatus) {
      return;
    }
    lastStatus = normalized;
    reportStatus(normalized);
  };
  return {
    setInitial: () => setStatus(STATUS_TEXT.thinking),
    updateFromChunk: (chunk) => {
      if (!chunk) {
        return;
      }
      const resolved = resolveStatusFromChunk(chunk);
      if (resolved) {
        setStatus(resolved);
      }
    },
  };
};

const normalizeToolCalls = (toolCalls) =>
  Array.isArray(toolCalls) ? toolCalls : [];

const createResponseStream = async function* createResponseStream({
  settings,
  signal,
  onStatus,
}) {
  const reportStatus = ensureStatusReporter(onStatus);
  const statusTracker = createStatusTracker(reportStatus);
  statusTracker.setInitial();
  const requestNext = async function* requestNext() {
    ensureNotAborted(signal);
    let assistantIndex = null;
    const onStreamStart = () => {
      assistantIndex = state.messages.length;
      addMessage({ role: "assistant", content: "" });
      renderMessagesView();
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
      onChunk: statusTracker.updateFromChunk,
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
    yield* requestNext();
  };
  yield* requestNext();
};

export default createResponseStream;
