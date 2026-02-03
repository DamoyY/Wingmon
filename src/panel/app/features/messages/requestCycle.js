import { buildSystemPrompt } from "../../../services/index.js";
import {
  apiToolAdapter,
  getToolDefinitions,
  handleToolCalls,
} from "../../../tools/index.js";
import { requestModel } from "../../../api/index.js";
import { addMessage, state } from "../../../state/index.js";
import { t } from "../../../utils/index.ts";
import { appendAssistantDelta, renderMessagesView } from "./presenter.js";

const createAbortError = () => {
    const error = new Error(t("requestStopped"));
    error.name = "AbortError";
    return error;
  },
  ensureNotAborted = (signal) => {
    if (signal?.aborted) {
      throw createAbortError();
    }
  },
  ensureStatusReporter = (reporter) => {
    if (typeof reporter !== "function") {
      throw new Error(t("requestInvalidStatusReporter"));
    }
    return reporter;
  },
  STATUS_KEYS = {
    thinking: "statusThinking",
    searching: "statusSearching",
    browsing: "statusBrowsing",
    operating: "statusOperating",
    coding: "statusCoding",
    speaking: "statusSpeaking",
    idle: "",
  },
  getStatusText = (statusKey) => (statusKey ? t(statusKey) : ""),
  TOOL_STATUS_MAP = {
    get_page: STATUS_KEYS.browsing,
    list_tabs: STATUS_KEYS.browsing,
    click_button: STATUS_KEYS.operating,
    enter_text: STATUS_KEYS.operating,
    close_page: STATUS_KEYS.operating,
    run_console: STATUS_KEYS.coding,
    show_html: STATUS_KEYS.coding,
  },
  getToolCallName = (call) => call?.function?.name || call?.name || "",
  getToolCallArguments = (call) =>
    call?.function?.arguments || call?.arguments || "",
  isGoogleSearchOpen = (argsText) =>
    typeof argsText === "string" &&
    argsText.includes("https://www.google.com/search"),
  resolveStatusFromToolCalls = (toolCalls) => {
    if (!Array.isArray(toolCalls) || !toolCalls.length) {
      return "";
    }
    for (let i = 0; i < toolCalls.length; i += 1) {
      const call = toolCalls[i],
        name = getToolCallName(call);
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
  },
  resolveStatusFromChunk = ({ delta, toolCalls }) => {
    const toolStatus = resolveStatusFromToolCalls(toolCalls);
    if (toolStatus) {
      return toolStatus;
    }
    if (delta) {
      return getStatusText(STATUS_KEYS.speaking);
    }
    return "";
  },
  resolvePendingAssistantIndex = (assistantIndex) => {
    if (!Number.isInteger(assistantIndex)) {
      return null;
    }
    const message = state.messages[assistantIndex];
    if (!message || message.role !== "assistant" || message.pending !== true) {
      return null;
    }
    return assistantIndex;
  },
  createStatusTracker = (reportStatus) => {
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
  },
  normalizeToolCalls = (toolCalls) =>
    Array.isArray(toolCalls) ? toolCalls : [],
  createResponseStream = async function* createResponseStream({
    settings,
    signal,
    onStatus,
    assistantIndex: initialAssistantIndex,
  }) {
    const reportStatus = ensureStatusReporter(onStatus),
      statusTracker = createStatusTracker(reportStatus);
    statusTracker.setInitial();
    const requestNext = async function* requestNext({
      assistantIndex: overrideAssistantIndex,
    } = {}) {
      ensureNotAborted(signal);
      let assistantIndex = resolvePendingAssistantIndex(overrideAssistantIndex);
      const onStreamStart = () => {
          const resolvedIndex = resolvePendingAssistantIndex(assistantIndex);
          if (resolvedIndex !== null) {
            assistantIndex = resolvedIndex;
            return;
          }
          assistantIndex = state.messages.length;
          addMessage({ role: "assistant", content: "", pending: true });
          renderMessagesView();
        },
        systemPrompt = await buildSystemPrompt(),
        tools = getToolDefinitions(settings.apiType),
        { toolCalls, reply, streamed } = await requestModel({
          settings,
          systemPrompt,
          tools,
          toolAdapter: apiToolAdapter,
          messages: state.messages,
          onDelta: appendAssistantDelta,
          onStreamStart,
          onChunk: statusTracker.updateFromChunk,
          signal,
        }),
        pendingToolCalls = normalizeToolCalls(toolCalls);
      yield {
        toolCalls: pendingToolCalls,
        reply,
        streamed,
        assistantIndex,
      };
      if (!pendingToolCalls.length) {
        return;
      }
      const toolMessages = await handleToolCalls(pendingToolCalls, signal);
      toolMessages.forEach((message) => addMessage(message));
      ensureNotAborted(signal);
      yield* requestNext();
    };
    yield* requestNext({ assistantIndex: initialAssistantIndex });
  };

export default createResponseStream;
