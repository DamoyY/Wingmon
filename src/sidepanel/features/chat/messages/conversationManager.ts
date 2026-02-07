import {
  addMessage,
  removeMessage,
  setStateValue,
  state,
  touchUpdatedAt,
} from "../../../core/store/index.ts";
import {
  getSettings,
  saveConversation,
  type Settings,
} from "../../../core/services/index.ts";
import { ensureSettingsReady } from "../../settings/model.ts";
import appendSharedPageContext from "./pageContext.ts";
import createResponseStream, {
  type ResponseStreamChunk,
} from "./requestCycle.ts";
import { createRandomId } from "../../../lib/utils/index.ts";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./responseHandlers.ts";

type ConversationManagerEvent =
  | { type: "sending-change"; sending: boolean }
  | { type: "status-change"; status: string }
  | { type: "settings-required"; settings: Settings }
  | { type: "message-accepted"; content: string };

type ConversationManagerListener = (event: ConversationManagerEvent) => void;

type ErrorDescriptor = {
  name: string;
  message: string;
};

type SendMessagePayload = {
  content: string;
  includePage?: boolean;
};

const ensureNotAborted = (signal: AbortSignal): void => {
    if (signal.aborted) {
      const error = new Error("已停止");
      error.name = "AbortError";
      throw error;
    }
  },
  resolvePendingAssistantIndex = (
    assistantIndex: number | null,
  ): number | null => {
    if (
      assistantIndex !== null &&
      Number.isInteger(assistantIndex) &&
      assistantIndex >= 0
    ) {
      const message = state.messages.at(assistantIndex);
      if (message?.role === "assistant" && message.pending === true) {
        return assistantIndex;
      }
    }
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const message = state.messages.at(i);
      if (message?.role === "assistant" && message.pending === true) {
        return i;
      }
    }
    return null;
  },
  resolveErrorDescriptor = (error: unknown): ErrorDescriptor => {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }
    if (typeof error === "string" && error.trim()) {
      return {
        name: "Error",
        message: error,
      };
    }
    return {
      name: "Error",
      message: "",
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
  clearPendingAssistant = (assistantIndex: number | null): void => {
    const resolvedAssistantIndex = resolvePendingAssistantIndex(assistantIndex);
    if (resolvedAssistantIndex === null) {
      return;
    }
    const message = state.messages.at(resolvedAssistantIndex);
    if (!message || message.role !== "assistant" || message.pending !== true) {
      return;
    }
    const hasContent =
      typeof message.content === "string" && Boolean(message.content.trim());
    if (hasContent) {
      return;
    }
    const indices = [resolvedAssistantIndex];
    for (
      let i = resolvedAssistantIndex + 1;
      i < state.messages.length;
      i += 1
    ) {
      const nextMessage = state.messages.at(i);
      if (!nextMessage) {
        break;
      }
      if (!nextMessage.hidden) {
        break;
      }
      indices.push(i);
    }
    indices
      .sort((a, b) => b - a)
      .forEach((index) => {
        removeMessage(index);
      });
  },
  saveCurrentConversation = async (): Promise<void> => {
    if (!state.messages.length) {
      return;
    }
    touchUpdatedAt();
    await saveConversation(
      state.conversationId,
      state.messages,
      state.updatedAt,
    );
  };

export class ConversationManager {
  #activeAbortController: AbortController | null = null;

  #listeners = new Set<ConversationManagerListener>();

  subscribe(listener: ConversationManagerListener): () => void {
    if (typeof listener !== "function") {
      throw new Error("会话监听器无效");
    }
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #emit(event: ConversationManagerEvent): void {
    this.#listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("会话监听回调执行失败", error);
      }
    });
  }

  #emitStatus(status: string): void {
    this.#emit({ type: "status-change", status });
  }

  stopSending(): Promise<void> {
    this.#emit({ type: "sending-change", sending: false });
    const abortController = this.#activeAbortController;
    if (!abortController) {
      return Promise.resolve();
    }
    abortController.abort();
    this.#emitStatus("");
    return Promise.resolve();
  }

  async sendMessage({
    content,
    includePage = false,
  }: SendMessagePayload): Promise<void> {
    if (state.sending) {
      return;
    }
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }
    const settings = await getSettings();
    if (!ensureSettingsReady(settings)) {
      this.#emit({ type: "settings-required", settings });
      return;
    }
    addMessage({ role: "user", content: normalizedContent });
    this.#emit({ type: "message-accepted", content: normalizedContent });
    setStateValue("sending", true);
    const abortController = new AbortController();
    this.#activeAbortController = abortController;
    this.#emit({ type: "sending-change", sending: true });
    this.#emitStatus("");
    let pendingAssistantIndex: number | null = null;
    try {
      await saveCurrentConversation();
      ensureNotAborted(abortController.signal);
      if (includePage) {
        await appendSharedPageContext({ signal: abortController.signal });
      }
      ensureNotAborted(abortController.signal);
      addMessage({
        role: "assistant",
        content: "",
        pending: true,
        groupId: createRandomId("assistant"),
      });
      pendingAssistantIndex = state.messages.length - 1;
      const responseStream = createResponseStream({
        settings,
        signal: abortController.signal,
        onStatus: (status: string) => {
          this.#emitStatus(status);
        },
        assistantIndex: pendingAssistantIndex,
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
      this.#emitStatus("");
      await saveCurrentConversation();
    } catch (error) {
      const resolvedError = resolveErrorDescriptor(error);
      if (isAbortError(resolvedError)) {
        clearPendingAssistant(pendingAssistantIndex);
        this.#emitStatus("");
        try {
          await saveCurrentConversation();
        } catch (saveError) {
          console.error("保存会话失败", saveError);
        }
        return;
      }
      console.error(resolvedError.message || "请求失败");
      clearPendingAssistant(pendingAssistantIndex);
      this.#emitStatus("");
      try {
        await saveCurrentConversation();
      } catch (saveError) {
        console.error("保存会话失败", saveError);
      }
    } finally {
      setStateValue("sending", false);
      if (this.#activeAbortController === abortController) {
        this.#activeAbortController = null;
      }
      this.#emit({ type: "sending-change", sending: false });
    }
  }
}
