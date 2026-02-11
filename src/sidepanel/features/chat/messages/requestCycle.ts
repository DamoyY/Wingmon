import {
  type Settings,
  buildSystemPrompt,
} from "../../../core/services/index.ts";
import {
  type ToolCall,
  getToolDefinitions,
} from "../../../core/agent/definitions.ts";
import {
  addAnthropicToolCallEvent,
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  extractAnthropicToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeAnthropicToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
} from "../../../core/agent/toolCallNormalization.ts";
import {
  addMessage,
  appendAssistantDelta,
  state,
  updateMessage,
} from "../../../core/store/index.ts";
import {
  buildChatMessages,
  buildMessagesInput,
  buildResponsesInput,
} from "../../../core/agent/message-builders.ts";
import { createRandomId, t } from "../../../lib/utils/index.ts";
import { handleToolCalls } from "../../../core/agent/executor.ts";
import requestModel from "../../../core/api/client.ts";

type StatusReporter = (status: string) => void;

type ApiToolAdapter = {
  addAnthropicToolCallEvent: typeof addAnthropicToolCallEvent;
  addChatToolCallDelta: typeof addChatToolCallDelta;
  addResponsesToolCallEvent: typeof addResponsesToolCallEvent;
  buildChatMessages: typeof buildChatMessages;
  buildMessagesInput: typeof buildMessagesInput;
  buildResponsesInput: typeof buildResponsesInput;
  extractAnthropicToolCalls: typeof extractAnthropicToolCalls;
  extractChatToolCalls: typeof extractChatToolCalls;
  extractResponsesToolCalls: typeof extractResponsesToolCalls;
  finalizeAnthropicToolCalls: typeof finalizeAnthropicToolCalls;
  finalizeChatToolCalls: typeof finalizeChatToolCalls;
  finalizeResponsesToolCalls: typeof finalizeResponsesToolCalls;
};

type RequestChunk = {
  delta: string;
  toolCalls: ToolCall[];
};

type CreateResponseStreamPayload = {
  settings: Settings;
  signal: AbortSignal;
  onStatus: StatusReporter;
  assistantIndex: number | null;
};

export type ResponseStreamChunk = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
  assistantIndex: number | null;
};

type StatusTracker = {
  reset: () => void;
  setInitial: () => void;
  replay: () => void;
  updateFromChunk: (chunk: RequestChunk) => void;
  dispose: () => void;
};

const STATUS_KEYS = {
  browsing: "statusBrowsing",
  coding: "statusCoding",
  idle: "",
  operating: "statusOperating",
  searching: "statusSearching",
  speaking: "statusSpeaking",
  thinking: "statusThinking",
} as const;

type StatusKey = (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS];

const STATUS_DOT_INTERVAL_MS = 360,
  STATUS_DOT_COUNT_MAX = 3,
  TOOL_STATUS_MAP: Record<string, StatusKey> = {
    click_button: STATUS_KEYS.operating,
    close_page: STATUS_KEYS.operating,
    enter_text: STATUS_KEYS.operating,
    find: STATUS_KEYS.searching,
    get_page: STATUS_KEYS.browsing,
    list_tabs: STATUS_KEYS.browsing,
    run_console: STATUS_KEYS.coding,
    show_html: STATUS_KEYS.coding,
  };

const apiToolAdapter: ApiToolAdapter = {
  addAnthropicToolCallEvent,
  addChatToolCallDelta,
  addResponsesToolCallEvent,
  buildChatMessages,
  buildMessagesInput,
  buildResponsesInput,
  extractAnthropicToolCalls,
  extractChatToolCalls,
  extractResponsesToolCalls,
  finalizeAnthropicToolCalls,
  finalizeChatToolCalls,
  finalizeResponsesToolCalls,
};

const createAbortError = (): Error => {
    const error = new Error(t("requestStopped"));
    error.name = "AbortError";
    return error;
  },
  ensureNotAborted = (signal: AbortSignal): void => {
    if (signal.aborted) {
      throw createAbortError();
    }
  },
  ensureStatusReporter = (reporter: StatusReporter): StatusReporter => {
    if (typeof reporter !== "function") {
      throw new Error(t("requestInvalidStatusReporter"));
    }
    return reporter;
  },
  buildAnimatedStatusText = (
    statusKey: StatusKey,
    dotCount: number,
  ): string => {
    if (!statusKey) {
      return "";
    }
    const baseText = t(statusKey).trimEnd();
    if (!baseText) {
      return "";
    }
    return `${baseText}${".".repeat(dotCount)}`;
  },
  getToolCallName = (call: ToolCall): string =>
    call.function?.name ?? call.name ?? "",
  getToolCallArguments = (call: ToolCall): string => {
    const args = call.function?.arguments ?? call.arguments;
    return typeof args === "string" ? args : "";
  },
  isGoogleSearchOpen = (argsText: string): boolean =>
    argsText.includes("https://www.google.com/search"),
  resolveStatusFromToolCalls = (toolCalls: ToolCall[]): StatusKey => {
    if (!toolCalls.length) {
      return STATUS_KEYS.idle;
    }
    for (const call of toolCalls) {
      const name = getToolCallName(call);
      if (!name) {
        continue;
      }
      if (name === "open_page") {
        return isGoogleSearchOpen(getToolCallArguments(call))
          ? STATUS_KEYS.searching
          : STATUS_KEYS.browsing;
      }
      const mapped = TOOL_STATUS_MAP[name];
      if (mapped) {
        return mapped;
      }
    }
    return STATUS_KEYS.idle;
  },
  resolveStatusFromChunk = ({ delta, toolCalls }: RequestChunk): StatusKey => {
    const toolStatus = resolveStatusFromToolCalls(toolCalls);
    if (toolStatus !== STATUS_KEYS.idle) {
      return toolStatus;
    }
    if (delta.length > 0) {
      return STATUS_KEYS.speaking;
    }
    return STATUS_KEYS.idle;
  },
  resolvePendingAssistantIndex = (
    assistantIndex: number | null,
  ): number | null => {
    if (assistantIndex === null || !Number.isInteger(assistantIndex)) {
      return null;
    }
    const message = state.messages.at(assistantIndex);
    if (!message || message.role !== "assistant" || message.pending !== true) {
      return null;
    }
    return assistantIndex;
  },
  createStatusTracker = (reportStatus: StatusReporter): StatusTracker => {
    let activeStatusKey: StatusKey = STATUS_KEYS.idle,
      lastRenderedStatus = "",
      dotCount = 0,
      dotTimer: ReturnType<typeof setInterval> | null = null;
    const reportIfChanged = (nextStatus: string): void => {
        if (nextStatus === lastRenderedStatus) {
          return;
        }
        lastRenderedStatus = nextStatus;
        reportStatus(nextStatus);
      },
      stopDotTimer = (): void => {
        if (dotTimer === null) {
          return;
        }
        clearInterval(dotTimer);
        dotTimer = null;
      },
      updateAnimatedStatus = (): void => {
        if (!activeStatusKey) {
          reportIfChanged("");
          return;
        }
        dotCount = (dotCount % STATUS_DOT_COUNT_MAX) + 1;
        reportIfChanged(buildAnimatedStatusText(activeStatusKey, dotCount));
      },
      startDotTimer = (): void => {
        if (!activeStatusKey || dotTimer !== null) {
          return;
        }
        dotTimer = setInterval(() => {
          updateAnimatedStatus();
        }, STATUS_DOT_INTERVAL_MS);
      },
      setStatusKey = (statusKey: StatusKey): void => {
        if (statusKey === activeStatusKey) {
          return;
        }
        stopDotTimer();
        activeStatusKey = statusKey;
        dotCount = 0;
        if (!statusKey) {
          reportIfChanged("");
          return;
        }
        updateAnimatedStatus();
        startDotTimer();
      };
    return {
      dispose: (): void => {
        stopDotTimer();
        activeStatusKey = STATUS_KEYS.idle;
        dotCount = 0;
        lastRenderedStatus = "";
      },
      replay: (): void => {
        if (!lastRenderedStatus) {
          return;
        }
        reportStatus(lastRenderedStatus);
      },
      reset: (): void => {
        stopDotTimer();
        activeStatusKey = STATUS_KEYS.idle;
        dotCount = 0;
        lastRenderedStatus = "";
      },
      setInitial: (): void => {
        setStatusKey(STATUS_KEYS.thinking);
      },
      updateFromChunk: (chunk: RequestChunk): void => {
        const resolved = resolveStatusFromChunk(chunk);
        if (resolved === STATUS_KEYS.idle) {
          return;
        }
        setStatusKey(resolved);
      },
    };
  },
  createResponseStream = async function* createResponseStream({
    settings,
    signal,
    onStatus,
    assistantIndex: initialAssistantIndex,
  }: CreateResponseStreamPayload): AsyncGenerator<ResponseStreamChunk> {
    const reportStatus = ensureStatusReporter(onStatus),
      statusTracker = createStatusTracker(reportStatus);
    let hasShownInitialStatus = false;
    const requestNext = async function* requestNext({
      assistantIndex: overrideAssistantIndex,
    }: {
      assistantIndex: number | null;
    }): AsyncGenerator<ResponseStreamChunk> {
      ensureNotAborted(signal);
      let assistantIndex = resolvePendingAssistantIndex(overrideAssistantIndex);
      const ensurePendingAssistant = (): string => {
          const resolvedIndex = resolvePendingAssistantIndex(assistantIndex);
          if (resolvedIndex !== null) {
            assistantIndex = resolvedIndex;
            const message = state.messages.at(assistantIndex);
            if (!message || message.role !== "assistant") {
              throw new Error("助手消息状态无效");
            }
            const groupId =
              typeof message.groupId === "string" ? message.groupId.trim() : "";
            if (groupId) {
              return groupId;
            }
            const nextGroupId = createRandomId("assistant");
            updateMessage(assistantIndex, { groupId: nextGroupId });
            return nextGroupId;
          }
          assistantIndex = state.messages.length;
          const nextGroupId = createRandomId("assistant");
          addMessage({
            content: "",
            groupId: nextGroupId,
            pending: true,
            role: "assistant",
          });
          return nextGroupId;
        },
        finalizeToolCallAssistant = (): void => {
          if (assistantIndex === null || !Number.isInteger(assistantIndex)) {
            return;
          }
          const message = state.messages.at(assistantIndex);
          if (!message || message.role !== "assistant") {
            return;
          }
          const hasContent =
            typeof message.content === "string" &&
            message.content.trim().length > 0;
          if (message.pending === true && !hasContent) {
            updateMessage(assistantIndex, { pending: false });
          }
        },
        onStreamStart = (): void => {
          ensurePendingAssistant();
        };
      ensurePendingAssistant();
      if (!hasShownInitialStatus) {
        hasShownInitialStatus = true;
        statusTracker.setInitial();
      } else {
        statusTracker.replay();
      }
      const systemPrompt = await buildSystemPrompt(settings.language),
        tools = getToolDefinitions(settings.apiType),
        requestResult = await requestModel({
          messages: state.messages,
          onChunk: statusTracker.updateFromChunk,
          onDelta: appendAssistantDelta,
          onStreamStart,
          settings,
          signal,
          systemPrompt,
          toolAdapter: apiToolAdapter,
          tools,
        }),
        pendingToolCalls = requestResult.toolCalls;
      yield {
        assistantIndex,
        reply: requestResult.reply,
        streamed: requestResult.streamed,
        toolCalls: pendingToolCalls,
      };
      if (!pendingToolCalls.length) {
        return;
      }
      const toolMessages = await handleToolCalls(pendingToolCalls, signal);
      toolMessages.forEach((message) => addMessage(message));
      ensureNotAborted(signal);
      finalizeToolCallAssistant();
      yield* requestNext({ assistantIndex });
    };
    try {
      yield* requestNext({ assistantIndex: initialAssistantIndex });
    } finally {
      statusTracker.dispose();
    }
  };

export default createResponseStream;
