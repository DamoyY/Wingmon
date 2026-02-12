import {
  AGENT_STATUS,
  type AgentStatus,
} from "../../../core/agent/toolResultFormatters.ts";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./responseHandlers.ts";
import {
  clearPendingAssistant,
  createPendingAssistant,
} from "./pendingAssistantLifecycle.ts";
import createResponseStream, {
  type ResponseStreamChunk,
} from "./requestCycle.ts";
import type { Settings } from "../../../core/services/index.ts";
import { addMessage } from "../../../core/store/index.ts";
import appendSharedPageContext from "./pageContext.ts";
import { persistConversationState } from "./conversationPersistence.ts";

type ErrorDescriptor = {
  message: string;
  name: string;
};

type MessageAcceptedReporter = (content: string) => void;
type StatusReporter = (status: AgentStatus) => void;

type SendMessagePayload = {
  content: string;
  includePage?: boolean;
  onMessageAccepted?: MessageAcceptedReporter;
  onStatusChange?: StatusReporter;
  settings: Settings;
  signal: AbortSignal;
};

const ensureNotAborted = (signal: AbortSignal): void => {
    if (signal.aborted) {
      const error = new Error("已停止");
      error.name = "AbortError";
      throw error;
    }
  },
  resolveErrorDescriptor = (error: unknown): ErrorDescriptor => {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
      };
    }
    if (typeof error === "string" && error.trim()) {
      return {
        message: error,
        name: "Error",
      };
    }
    return {
      message: "",
      name: "Error",
    };
  },
  isAbortError = (error: ErrorDescriptor): boolean => {
    if (error.name === "AbortError") {
      return true;
    }
    if (error.message === "已停止") {
      return true;
    }
    return false;
  },
  saveConversationStateSafely = async (): Promise<void> => {
    try {
      await persistConversationState({ deleteWhenEmpty: false });
    } catch (error) {
      console.error("保存会话失败", error);
    }
  },
  saveConversationState = async (): Promise<void> => {
    await persistConversationState({ deleteWhenEmpty: false });
  },
  noopStatusReporter: StatusReporter = (): void => {},
  noopMessageAcceptedReporter: MessageAcceptedReporter = (): void => {},
  reportStatusSafely = (
    reportStatus: StatusReporter,
    status: AgentStatus,
  ): void => {
    try {
      reportStatus(status);
    } catch (error) {
      console.error("状态回调执行失败", error);
    }
  },
  reportMessageAcceptedSafely = (
    reportAccepted: MessageAcceptedReporter,
    content: string,
  ): void => {
    try {
      reportAccepted(content);
    } catch (error) {
      console.error("消息接收回调执行失败", error);
    }
  };

export class ConversationManager {
  async sendMessage({
    content,
    includePage = false,
    settings,
    signal,
    onStatusChange = noopStatusReporter,
    onMessageAccepted = noopMessageAcceptedReporter,
  }: SendMessagePayload): Promise<void> {
    if (typeof onStatusChange !== "function") {
      throw new Error("状态回调无效");
    }
    if (typeof onMessageAccepted !== "function") {
      throw new Error("消息接收回调无效");
    }
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }
    addMessage({ content: normalizedContent, role: "user" });
    reportMessageAcceptedSafely(onMessageAccepted, normalizedContent);
    let pendingAssistantIndex: number | null = null;
    try {
      await saveConversationState();
      ensureNotAborted(signal);
      if (includePage) {
        await appendSharedPageContext({ apiType: settings.apiType, signal });
      }
      ensureNotAborted(signal);
      pendingAssistantIndex = createPendingAssistant();
      const responseStream = createResponseStream({
        assistantIndex: pendingAssistantIndex,
        onStatus: (status: AgentStatus) => {
          reportStatusSafely(onStatusChange, status);
        },
        settings,
        signal,
      });
      let response = await responseStream.next();
      while (!response.done) {
        const value: ResponseStreamChunk = response.value;
        if (
          value.assistantIndex !== null &&
          Number.isInteger(value.assistantIndex)
        ) {
          pendingAssistantIndex = value.assistantIndex;
        }
        if (value.streamed) {
          applyStreamedResponse(value.toolCalls, value.assistantIndex);
        } else {
          applyNonStreamedResponse(
            value.reply,
            value.toolCalls,
            value.assistantIndex,
          );
        }
        response = await responseStream.next();
      }
      reportStatusSafely(onStatusChange, AGENT_STATUS.idle);
      await saveConversationState();
    } catch (error) {
      const resolvedError = resolveErrorDescriptor(error);
      if (isAbortError(resolvedError)) {
        clearPendingAssistant(pendingAssistantIndex);
        reportStatusSafely(onStatusChange, AGENT_STATUS.idle);
        await saveConversationStateSafely();
        return;
      }
      console.error(resolvedError.message || "请求失败");
      clearPendingAssistant(pendingAssistantIndex);
      reportStatusSafely(onStatusChange, AGENT_STATUS.idle);
      await saveConversationStateSafely();
    }
  }
}
