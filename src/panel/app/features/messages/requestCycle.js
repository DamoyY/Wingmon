import { buildSystemPrompt } from "../../../services/index.js";
import {
  apiToolAdapter,
  getToolDefinitions,
  handleToolCalls,
} from "../../../tools/index.js";
import { requestModel } from "../../../api/index.js";
import { addMessage, state } from "../../../state/index.js";
import { t } from "../../../utils/index.js";
import { appendAssistantDelta, renderMessagesView } from "./presenter.js";

const createAbortError = () => {
  const error = new Error(t("requestStopped"));
  error.name = "AbortError";
  return error;
};

const ensureNotAborted = (signal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

const ensureStatusReporter = (reporter) => {
  if (typeof reporter !== "function") {
    throw new Error(t("requestInvalidStatusReporter"));
  }
  return reporter;
};

const STATUS_KEYS = {
  thinking: "statusThinking",
  searching: "statusSearching",
  browsing: "statusBrowsing",
  operating: "statusOperating",
  coding: "statusCoding",
  speaking: "statusSpeaking",
  idle: "",
};

const getStatusText = (statusKey) => (statusKey ? t(statusKey) : "");

const TOOL_STATUS_MAP = {
  get_page: STATUS_KEYS.browsing,
  list_tabs: STATUS_KEYS.browsing,
  click_button: STATUS_KEYS.operating,
  close_page: STATUS_KEYS.operating,
  run_console: STATUS_KEYS.coding,
  show_html: STATUS_KEYS.coding,
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
          return getStatusText(STATUS_KEYS.searching);
        }
        return getStatusText(STATUS_KEYS.browsing);
      }
      const mapped = TOOL_STATUS_MAP[name];
      if (mapped) {
        return getStatusText(mapped);
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
    return getStatusText(STATUS_KEYS.speaking);
  }
  return "";
};

const createStatusTracker = (reportStatus) => {
  let lastStatus = getStatusText(STATUS_KEYS.idle);
  const setStatus = (nextStatus) => {
    const normalized = typeof nextStatus === "string" ? nextStatus : "";
    if (normalized === lastStatus) {
      return;
    }
    lastStatus = normalized;
    reportStatus(normalized);
  };
  return {
    setInitial: () => setStatus(getStatusText(STATUS_KEYS.thinking)),
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
