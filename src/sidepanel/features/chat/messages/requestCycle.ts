import {
  buildSystemPrompt,
  type Settings,
} from "../../../core/services/index.ts";
import rawApiToolAdapter from "../../../core/agent/api-adapter.js";
import {
  getToolDefinitions,
  type ToolCall,
  type ToolDefinition,
} from "../../../core/agent/definitions.ts";
import { handleToolCalls } from "../../../core/agent/executor.ts";
import rawRequestModel from "../../../core/api/client.js";
import {
  addMessage,
  appendAssistantDelta,
  state,
  updateMessage,
  type MessageRecord,
} from "../../../core/store/index.ts";
import { createRandomId, t } from "../../../lib/utils/index.ts";
import { renderMessagesView } from "./presenter.ts";

type StatusReporter = (status: string) => void;

type ToolAdapterMethod = (...args: unknown[]) => unknown;

type ApiToolAdapter = {
  addChatToolCallDelta: ToolAdapterMethod;
  addResponsesToolCallEvent: ToolAdapterMethod;
  buildChatMessages: ToolAdapterMethod;
  buildResponsesInput: ToolAdapterMethod;
  extractChatToolCalls: ToolAdapterMethod;
  extractResponsesToolCalls: ToolAdapterMethod;
  finalizeChatToolCalls: ToolAdapterMethod;
  finalizeResponsesToolCalls: ToolAdapterMethod;
};

type RequestChunk = {
  delta?: string;
  toolCalls?: ToolCall[];
};

type RequestModelPayload = {
  settings: Settings;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolAdapter: ApiToolAdapter;
  messages: MessageRecord[];
  onDelta: (delta: string | null | undefined) => void;
  onStreamStart: () => void;
  onChunk: (chunk: RequestChunk) => void;
  signal: AbortSignal;
};

type RawRequestModel = (payload: RequestModelPayload) => Promise<unknown>;

type RequestModelResult = {
  toolCalls: ToolCall[];
  reply: string;
  streamed: boolean;
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
  updateFromChunk: (chunk: RequestChunk) => void;
  dispose: () => void;
};

const STATUS_KEYS = {
  thinking: "statusThinking",
  searching: "statusSearching",
  browsing: "statusBrowsing",
  operating: "statusOperating",
  coding: "statusCoding",
  speaking: "statusSpeaking",
  idle: "",
} as const;

type StatusKey = (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS];

const STATUS_DOT_INTERVAL_MS = 360,
  STATUS_DOT_COUNT_MAX = 3,
  TOOL_STATUS_MAP: Record<string, StatusKey> = {
    get_page: STATUS_KEYS.browsing,
    list_tabs: STATUS_KEYS.browsing,
    click_button: STATUS_KEYS.operating,
    enter_text: STATUS_KEYS.operating,
    close_page: STATUS_KEYS.operating,
    run_console: STATUS_KEYS.coding,
    show_html: STATUS_KEYS.coding,
  },
  isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  isToolAdapterMethod = (value: unknown): value is ToolAdapterMethod =>
    typeof value === "function",
  isToolCall = (value: unknown): value is ToolCall => isRecord(value),
  isRawRequestModel = (value: unknown): value is RawRequestModel =>
    typeof value === "function",
  resolveToolAdapterMethod = (
    value: Record<string, unknown>,
    key: keyof ApiToolAdapter,
  ): ToolAdapterMethod => {
    const method = value[key];
    if (!isToolAdapterMethod(method)) {
      throw new Error(`工具适配器缺少方法：${key}`);
    }
    return method;
  },
  ensureApiToolAdapter = (value: unknown): ApiToolAdapter => {
    if (!isRecord(value)) {
      throw new Error("工具适配器无效");
    }
    return {
      addChatToolCallDelta: resolveToolAdapterMethod(
        value,
        "addChatToolCallDelta",
      ),
      addResponsesToolCallEvent: resolveToolAdapterMethod(
        value,
        "addResponsesToolCallEvent",
      ),
      buildChatMessages: resolveToolAdapterMethod(value, "buildChatMessages"),
      buildResponsesInput: resolveToolAdapterMethod(
        value,
        "buildResponsesInput",
      ),
      extractChatToolCalls: resolveToolAdapterMethod(
        value,
        "extractChatToolCalls",
      ),
      extractResponsesToolCalls: resolveToolAdapterMethod(
        value,
        "extractResponsesToolCalls",
      ),
      finalizeChatToolCalls: resolveToolAdapterMethod(
        value,
        "finalizeChatToolCalls",
      ),
      finalizeResponsesToolCalls: resolveToolAdapterMethod(
        value,
        "finalizeResponsesToolCalls",
      ),
    };
  },
  ensureRequestModel = (value: unknown): RawRequestModel => {
    if (!isRawRequestModel(value)) {
      throw new Error("模型请求函数无效");
    }
    return value;
  },
  normalizeToolCalls = (toolCalls: unknown): ToolCall[] => {
    if (!Array.isArray(toolCalls)) {
      return [];
    }
    return toolCalls.filter(isToolCall);
  },
  normalizeRequestModelResult = (value: unknown): RequestModelResult => {
    if (!isRecord(value)) {
      throw new Error("模型响应格式无效");
    }
    const reply = typeof value.reply === "string" ? value.reply : "";
    return {
      toolCalls: normalizeToolCalls(value.toolCalls),
      reply,
      streamed: value.streamed === true,
    };
  };

const apiToolAdapter = ensureApiToolAdapter(rawApiToolAdapter);
const requestModel = ensureRequestModel(rawRequestModel);

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
    const toolStatus = resolveStatusFromToolCalls(
      normalizeToolCalls(toolCalls),
    );
    if (toolStatus !== STATUS_KEYS.idle) {
      return toolStatus;
    }
    if (typeof delta === "string" && delta.length > 0) {
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
      dispose: (): void => {
        stopDotTimer();
        activeStatusKey = STATUS_KEYS.idle;
        dotCount = 0;
        lastRenderedStatus = "";
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
    let initializedGroupId = "";
    const requestNext = async function* requestNext({
      assistantIndex: overrideAssistantIndex,
    }: {
      assistantIndex?: number | null;
    } = {}): AsyncGenerator<ResponseStreamChunk> {
      ensureNotAborted(signal);
      let assistantIndex = resolvePendingAssistantIndex(
        overrideAssistantIndex ?? null,
      );
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
            role: "assistant",
            content: "",
            pending: true,
            groupId: nextGroupId,
          });
          renderMessagesView();
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
              message.content.trim().length > 0,
            patch: Partial<Pick<MessageRecord, "status" | "pending">> = {};
          if (typeof message.status === "string" && message.status) {
            patch.status = "";
          }
          if (message.pending === true && !hasContent) {
            patch.pending = false;
          }
          if (Object.keys(patch).length > 0) {
            updateMessage(assistantIndex, patch);
          }
        },
        onStreamStart = (): void => {
          ensurePendingAssistant();
        };
      const currentGroupId = ensurePendingAssistant();
      statusTracker.reset();
      if (currentGroupId && currentGroupId !== initializedGroupId) {
        initializedGroupId = currentGroupId;
        statusTracker.setInitial();
      }
      const systemPrompt = await buildSystemPrompt(),
        tools = getToolDefinitions(settings.apiType),
        requestResult = normalizeRequestModelResult(
          await requestModel({
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
        ),
        pendingToolCalls = requestResult.toolCalls;
      yield {
        toolCalls: pendingToolCalls,
        reply: requestResult.reply,
        streamed: requestResult.streamed,
        assistantIndex,
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
