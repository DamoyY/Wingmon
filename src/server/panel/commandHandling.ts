import {
  AGENT_STATUS,
  type AgentStatus,
  type PanelServerCommandRequest,
  type PanelServerCommandResponse,
  createPanelCommandError,
  normalizeIndices,
} from "../../shared/index.ts";
import {
  loadConversationState,
  removeMessage,
  resetConversation,
  setStateValue,
  state,
  touchUpdatedAt,
} from "../../shared/state/panelStateContext.ts";
import type { ConversationManager } from "../conversation/index.ts";
import {
  deleteConversation,
  getSettings,
  loadConversation,
  persistConversation,
} from "../services/index.ts";
import { ensureSettingsReady } from "../settings/index.ts";
import { normalizeErrorMessage } from "./errorText.ts";

type CommandDataMap = {
  deleteConversation: { deleted: true };
  deleteMessages: { deletedCount: number };
  loadConversation: { loaded: true };
  resetConversation: { reset: true };
  sendMessage: { accepted: true };
  stopSending: { stopped: boolean };
};

type CommandHandlingDependencies = {
  conversationManager: ConversationManager;
  setAgentStatus: (status: AgentStatus) => void;
  getActiveAbortController: () => AbortController | null;
  setActiveAbortController: (controller: AbortController | null) => void;
  notifyReplyWhenPanelClosed: (replyContent: string) => Promise<void>;
};

const resolveCompletedAssistantContentFrom = (
  startIndex: number,
): string | null => {
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    throw new Error("起始消息索引无效");
  }
  for (
    let messageIndex = state.messages.length - 1;
    messageIndex >= startIndex;
    messageIndex -= 1
  ) {
    const message = state.messages.at(messageIndex);
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (message.role !== "assistant" || message.pending) {
      continue;
    }
    if (!message.content.trim()) {
      continue;
    }
    return message.content;
  }
  return null;
};

const validateConversationId = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("conversationId 必须是字符串");
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("conversationId 不能为空");
  }
  return normalized;
};

const validateIndices = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw new Error("indices 必须是数组");
  }
  if (!value.every((index) => Number.isInteger(index) && index >= 0)) {
    throw new Error("indices 必须是非负整数数组");
  }
  return normalizeIndices(value);
};

const collectHiddenIndicesForward = (startIndex: number): number[] => {
  const hiddenIndices: number[] = [];
  for (let i = startIndex + 1; i < state.messages.length; i += 1) {
    const message = state.messages.at(i);
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (!message.hidden) {
      break;
    }
    hiddenIndices.push(i);
  }
  return hiddenIndices;
};

const collectHiddenIndicesBackward = (startIndex: number): number[] => {
  const hiddenIndices: number[] = [];
  for (let i = startIndex - 1; i >= 0; i -= 1) {
    const message = state.messages.at(i);
    if (!message) {
      throw new Error("消息索引无效");
    }
    if (!message.hidden) {
      break;
    }
    hiddenIndices.push(i);
  }
  return hiddenIndices;
};

const persistConversationState = async (): Promise<void> => {
  if (state.messages.length > 0) {
    touchUpdatedAt();
  }
  await persistConversation(
    state.conversationId,
    state.messages,
    state.updatedAt,
  );
};

const ensureNotSending = (): void => {
  if (state.sending) {
    throw new Error("当前正在回复中");
  }
};

const createDeleteMessagesHandler =
  () =>
  async (
    indices: number[],
  ): Promise<PanelServerCommandResponse<CommandDataMap["deleteMessages"]>> => {
    ensureNotSending();
    const hiddenIndices = new Set<number>();
    indices.forEach((index) => {
      const message = state.messages.at(index);
      if (!message) {
        throw new Error("消息索引无效");
      }
      if (message.role === "user") {
        collectHiddenIndicesForward(index).forEach((hiddenIndex) => {
          hiddenIndices.add(hiddenIndex);
        });
        return;
      }
      if (message.role === "assistant") {
        collectHiddenIndicesBackward(index).forEach((hiddenIndex) => {
          hiddenIndices.add(hiddenIndex);
        });
        if (
          Array.isArray(message.tool_calls) &&
          message.tool_calls.length > 0
        ) {
          collectHiddenIndicesForward(index).forEach((hiddenIndex) => {
            hiddenIndices.add(hiddenIndex);
          });
        }
      }
    });
    const combinedIndices = Array.from(
      new Set([...indices, ...Array.from(hiddenIndices)]),
    ).sort((a, b) => b - a);
    combinedIndices.forEach((index) => {
      removeMessage(index);
    });
    await persistConversationState();
    return { data: { deletedCount: combinedIndices.length }, ok: true };
  };

const createConversationSendRunner =
  (dependencies: CommandHandlingDependencies) =>
  async ({
    content,
    includePage,
  }: {
    content: string;
    includePage: boolean;
  }): Promise<void> => {
    const messageStartIndex = state.messages.length;
    const settings = await getSettings();
    if (!ensureSettingsReady(settings)) {
      setStateValue("sending", false, { type: "server" });
      dependencies.setAgentStatus(AGENT_STATUS.idle);
      return;
    }
    const abortController = new AbortController();
    dependencies.setActiveAbortController(abortController);
    try {
      await dependencies.conversationManager.sendMessage({
        content,
        includePage,
        onStatusChange: (status: AgentStatus) => {
          dependencies.setAgentStatus(status);
        },
        settings,
        signal: abortController.signal,
      });
      const replyContent =
        resolveCompletedAssistantContentFrom(messageStartIndex);
      if (replyContent !== null) {
        await dependencies.notifyReplyWhenPanelClosed(replyContent);
      }
    } catch (error) {
      console.error("后台发送会话消息失败", error);
    } finally {
      if (dependencies.getActiveAbortController() === abortController) {
        dependencies.setActiveAbortController(null);
      }
      setStateValue("sending", false, { type: "server" });
      dependencies.setAgentStatus(AGENT_STATUS.idle);
    }
  };

const createSendMessageHandler =
  (
    dependencies: CommandHandlingDependencies,
    runConversationSend: ({
      content,
      includePage,
    }: {
      content: string;
      includePage: boolean;
    }) => Promise<void>,
  ) =>
  async (
    payload: PanelServerCommandRequest<"sendMessage">["payload"],
  ): Promise<PanelServerCommandResponse<CommandDataMap["sendMessage"]>> => {
    ensureNotSending();
    if (typeof payload.content !== "string") {
      return createPanelCommandError("invalid_payload", "content 必须是字符串");
    }
    if (typeof payload.includePage !== "boolean") {
      return createPanelCommandError(
        "invalid_payload",
        "includePage 必须是布尔值",
      );
    }
    const normalizedContent = payload.content.trim();
    if (!normalizedContent) {
      return createPanelCommandError("invalid_payload", "content 不能为空");
    }
    const settings = await getSettings();
    if (!ensureSettingsReady(settings)) {
      return createPanelCommandError(
        "not_ready",
        "请先补全 API Key、Base URL 和模型",
      );
    }
    setStateValue("sending", true, { type: "server" });
    dependencies.setAgentStatus(AGENT_STATUS.idle);
    void runConversationSend({
      content: normalizedContent,
      includePage: payload.includePage,
    });
    return { data: { accepted: true }, ok: true };
  };

const createStopSendingHandler =
  (
    dependencies: CommandHandlingDependencies,
  ): (() => PanelServerCommandResponse<CommandDataMap["stopSending"]>) =>
  () => {
    const current = dependencies.getActiveAbortController();
    if (!current) {
      return { data: { stopped: false }, ok: true };
    }
    current.abort();
    return { data: { stopped: true }, ok: true };
  };

const createResetConversationHandler =
  (
    dependencies: CommandHandlingDependencies,
  ): (() => PanelServerCommandResponse<CommandDataMap["resetConversation"]>) =>
  () => {
    ensureNotSending();
    resetConversation();
    setStateValue("sending", false, { type: "server" });
    dependencies.setAgentStatus(AGENT_STATUS.idle);
    return { data: { reset: true }, ok: true };
  };

const createLoadConversationHandler =
  (dependencies: CommandHandlingDependencies) =>
  async (
    payload: PanelServerCommandRequest<"loadConversation">["payload"],
  ): Promise<
    PanelServerCommandResponse<CommandDataMap["loadConversation"]>
  > => {
    ensureNotSending();
    const conversationId = validateConversationId(payload.conversationId);
    let conversation: Awaited<ReturnType<typeof loadConversation>>;
    try {
      conversation = await loadConversation(conversationId);
    } catch (error) {
      const message = normalizeErrorMessage(error, "对话记录不存在");
      return createPanelCommandError("not_found", message);
    }
    loadConversationState(
      conversation.id,
      conversation.messages,
      conversation.updatedAt,
    );
    setStateValue("sending", false, { type: "server" });
    dependencies.setAgentStatus(AGENT_STATUS.idle);
    return { data: { loaded: true }, ok: true };
  };

const createDeleteConversationHandler =
  (dependencies: CommandHandlingDependencies) =>
  async (
    payload: PanelServerCommandRequest<"deleteConversation">["payload"],
  ): Promise<
    PanelServerCommandResponse<CommandDataMap["deleteConversation"]>
  > => {
    const conversationId = validateConversationId(payload.conversationId);
    await deleteConversation(conversationId);
    if (conversationId === state.conversationId) {
      resetConversation();
      setStateValue("sending", false, { type: "server" });
      dependencies.setAgentStatus(AGENT_STATUS.idle);
    }
    return { data: { deleted: true }, ok: true };
  };

export const createPanelCommandRequestHandler = (
  dependencies: CommandHandlingDependencies,
): ((
  request: PanelServerCommandRequest,
) => Promise<PanelServerCommandResponse>) => {
  const runConversationSend = createConversationSendRunner(dependencies);
  const handleDeleteMessages = createDeleteMessagesHandler();
  const handleSendMessage = createSendMessageHandler(
    dependencies,
    runConversationSend,
  );
  const handleStopSending = createStopSendingHandler(dependencies);
  const handleResetConversation = createResetConversationHandler(dependencies);
  const handleLoadConversation = createLoadConversationHandler(dependencies);
  const handleDeleteConversation =
    createDeleteConversationHandler(dependencies);

  return async (
    request: PanelServerCommandRequest,
  ): Promise<PanelServerCommandResponse> => {
    try {
      switch (request.command) {
        case "sendMessage":
          return await handleSendMessage(request.payload);
        case "stopSending":
          return handleStopSending();
        case "resetConversation":
          return handleResetConversation();
        case "loadConversation":
          return await handleLoadConversation(request.payload);
        case "deleteConversation":
          return await handleDeleteConversation(request.payload);
        case "deleteMessages":
          return await handleDeleteMessages(
            validateIndices(request.payload.indices),
          );
        default:
          return createPanelCommandError("invalid_payload", "未知指令");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("正在回复")) {
          return createPanelCommandError("busy", error.message);
        }
        return createPanelCommandError("invalid_payload", error.message);
      }
      return createPanelCommandError("internal", "处理指令失败");
    }
  };
};
