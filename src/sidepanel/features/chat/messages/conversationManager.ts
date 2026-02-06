import {
  addMessage,
  type MessageRecord,
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
import appendSharedPageContext from "./pageContext.js";
import createResponseStream from "./requestCycle.js";
import { createRandomId } from "../../../lib/utils/index.ts";
import {
  applyNonStreamedResponse,
  applyStreamedResponse,
} from "./responseHandlers.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ResponseStreamChunk = {
  toolCalls: JsonObject[];
  reply: string;
  streamed: boolean;
  assistantIndex: number | null;
};

type ResponseStreamFactory = (payload: {
  settings: Settings;
  signal: AbortSignal;
  onStatus: (status: string) => void;
  assistantIndex: number | null;
}) => AsyncGenerator<ResponseStreamChunk>;

type PageContextAppender = (payload: { signal: AbortSignal }) => Promise<void>;

type SaveConversation = (
  conversationId: string,
  messages: MessageRecord[],
  updatedAt: number,
) => Promise<void>;

type ApplyStreamedResponse = (
  toolCalls: JsonObject[],
  assistantIndex: number | null,
) => void;

type ApplyNonStreamedResponse = (
  reply: string,
  toolCalls: JsonObject[],
  assistantIndex: number | null,
) => void;

const createResponseStreamSafe = createResponseStream as ResponseStreamFactory;
const appendSharedPageContextSafe =
  appendSharedPageContext as PageContextAppender;
const saveConversationSafe = saveConversation as SaveConversation;
const applyStreamedResponseSafe =
  applyStreamedResponse as ApplyStreamedResponse;
const applyNonStreamedResponseSafe =
  applyNonStreamedResponse as ApplyNonStreamedResponse;

type ConversationManagerEvent =
  | { type: "sending-change"; sending: boolean }
  | { type: "status-change"; status: string }
  | { type: "settings-required"; settings: Settings }
  | { type: "message-accepted"; content: string };

type ConversationManagerListener = (event: ConversationManagerEvent) => void;

type ErrorLike =
  | Error
  | {
      name?: string;
      message?: string;
    }
  | null
  | undefined;

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
  isAbortError = (error: ErrorLike): boolean => {
    if (!error) {
      return false;
    }
    if (error.name === "AbortError") {
      return true;
    }
    if (typeof error.message === "string" && error.message === "已停止") {
      return true;
    }
    return false;
  },
  clearPendingAssistant = (assistantIndex: number | null): void => {
    if (assistantIndex === null || !Number.isInteger(assistantIndex)) {
      return;
    }
    const resolvedAssistantIndex = assistantIndex;
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
    await saveConversationSafe(
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

  async stopSending(): Promise<void> {
    this.#emit({ type: "sending-change", sending: false });
    const abortController = this.#activeAbortController;
    if (!abortController) {
      return;
    }
    abortController.abort();
    this.#emitStatus("");
    await saveCurrentConversation();
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
        await appendSharedPageContextSafe({ signal: abortController.signal });
      }
      ensureNotAborted(abortController.signal);
      addMessage({
        role: "assistant",
        content: "",
        pending: true,
        groupId: createRandomId("assistant"),
      });
      pendingAssistantIndex = state.messages.length - 1;
      const responseStream = createResponseStreamSafe({
        settings,
        signal: abortController.signal,
        onStatus: (status) => {
          this.#emitStatus(status);
        },
        assistantIndex: pendingAssistantIndex,
      });
      let response = await responseStream.next();
      while (!response.done) {
        const value = response.value;
        if (value.streamed) {
          applyStreamedResponseSafe(value.toolCalls, value.assistantIndex);
        } else {
          applyNonStreamedResponseSafe(
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
      const resolvedError = error as ErrorLike;
      if (isAbortError(resolvedError)) {
        clearPendingAssistant(pendingAssistantIndex);
        this.#emitStatus("");
        return;
      }
      console.error(resolvedError?.message || "请求失败");
      clearPendingAssistant(pendingAssistantIndex);
      this.#emitStatus("");
    } finally {
      setStateValue("sending", false);
      if (this.#activeAbortController === abortController) {
        this.#activeAbortController = null;
      }
      this.#emit({ type: "sending-change", sending: false });
    }
  }
}
