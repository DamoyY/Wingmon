import {
  AGENT_STATUS,
  type AgentStatus,
  resolveStatusFromToolCalls,
} from "../../../core/agent/toolResultFormatters.ts";
import {
  type Settings,
  buildSystemPrompt,
} from "../../../core/services/index.ts";
import {
  type ToolCall,
  getToolDefinitions,
} from "../../../core/agent/definitions.ts";
import {
  addMessage,
  appendAssistantDelta,
  state,
  updateMessage,
} from "../../../core/store/index.ts";
import { createRandomId, t } from "../../../lib/utils/index.ts";
import { handleToolCalls } from "../../../core/agent/executor.ts";
import requestModel from "../../../core/api/client.ts";

type StatusReporter = (status: AgentStatus) => void;

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
  resolveStatusFromChunk = ({
    delta,
    toolCalls,
  }: RequestChunk): AgentStatus => {
    const toolStatus = resolveStatusFromToolCalls(toolCalls);
    if (toolStatus !== AGENT_STATUS.idle) {
      return toolStatus;
    }
    if (delta.length > 0) {
      return AGENT_STATUS.speaking;
    }
    return AGENT_STATUS.idle;
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
    let activeStatus: AgentStatus = AGENT_STATUS.idle,
      lastReportedStatus: AgentStatus = AGENT_STATUS.idle;
    const reportIfChanged = (nextStatus: AgentStatus): void => {
        if (nextStatus === lastReportedStatus) {
          return;
        }
        lastReportedStatus = nextStatus;
        reportStatus(nextStatus);
      },
      setStatus = (status: AgentStatus): void => {
        if (status === activeStatus) {
          return;
        }
        activeStatus = status;
        reportIfChanged(status);
      };
    return {
      dispose: (): void => {
        activeStatus = AGENT_STATUS.idle;
        lastReportedStatus = AGENT_STATUS.idle;
      },
      replay: (): void => {
        if (lastReportedStatus === AGENT_STATUS.idle) {
          return;
        }
        reportStatus(lastReportedStatus);
      },
      reset: (): void => {
        activeStatus = AGENT_STATUS.idle;
        lastReportedStatus = AGENT_STATUS.idle;
      },
      setInitial: (): void => {
        setStatus(AGENT_STATUS.thinking);
      },
      updateFromChunk: (chunk: RequestChunk): void => {
        const resolved = resolveStatusFromChunk(chunk);
        if (resolved === AGENT_STATUS.idle) {
          return;
        }
        setStatus(resolved);
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
