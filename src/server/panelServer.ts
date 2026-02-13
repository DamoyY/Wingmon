import {
  AGENT_STATUS,
  type AgentStatus,
  PANEL_SERVER_PORT_NAME,
  PANEL_SERVER_SNAPSHOT_TYPE,
  type PanelAgentStatus,
  type PanelMessageRecord,
  type PanelServerCommandRequest,
  type PanelServerCommandResponse,
  type PanelServerSnapshotMessage,
  type PanelStateSnapshot,
  createPanelCommandError,
  isPanelServerCommandRequest,
  isPanelStateSnapshot,
  normalizeIndices,
} from "../shared/index.ts";
import {
  type MessageRecord,
  loadConversationState,
  removeMessage,
  resetConversation,
  setMessages,
  setStateValue,
  state,
  subscribeState,
  touchUpdatedAt,
} from "../shared/state/panelStateContext.ts";
import {
  deleteConversation,
  getSettings,
  initTabListeners,
  loadConversation,
  persistConversation,
} from "./services/index.ts";
import { ConversationManager } from "./conversation/index.ts";
import { ensureOffscreenDocument } from "./offscreenDocument.ts";
import { ensureSettingsReady } from "./settings/index.ts";

type CommandDataMap = {
  deleteConversation: { deleted: true };
  deleteMessages: { deletedCount: number };
  loadConversation: { loaded: true };
  resetConversation: { reset: true };
  sendMessage: { accepted: true };
  stopSending: { stopped: boolean };
};

type StateSubscriptionCleanup = () => void;

const PANEL_STATE_STORAGE_KEY = "panel_server_state";

const panelPorts = new Set<chrome.runtime.Port>();
const stateSubscriptionCleanups: StateSubscriptionCleanup[] = [];
const conversationManager = new ConversationManager();

let panelServerReady = false;
let commandListenerReady = false;
let portListenerReady = false;
let activeAbortController: AbortController | null = null;
let persistTimerId: number | null = null;
let activeAgentStatus: PanelAgentStatus = AGENT_STATUS.idle;

const normalizeErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
};

const cloneMessageRecord = (message: MessageRecord): PanelMessageRecord => {
  const normalized: PanelMessageRecord = { ...message };
  if (Array.isArray(message.tool_calls)) {
    normalized.tool_calls = message.tool_calls.map((call) => ({ ...call }));
  } else {
    delete normalized.tool_calls;
  }
  return normalized;
};

const createPanelSnapshot = (): PanelStateSnapshot => ({
  agentStatus: activeAgentStatus,
  conversationId: state.conversationId,
  messages: state.messages.map((message) => cloneMessageRecord(message)),
  sending: state.sending,
  systemPrompt: state.systemPrompt,
  updatedAt: state.updatedAt,
});

const buildSnapshotMessage = (): PanelServerSnapshotMessage => ({
  snapshot: createPanelSnapshot(),
  type: PANEL_SERVER_SNAPSHOT_TYPE,
});

const postSnapshotToPort = (port: chrome.runtime.Port): void => {
  try {
    port.postMessage(buildSnapshotMessage());
  } catch (error) {
    console.error("向 side panel 推送状态失败", error);
  }
};

const broadcastSnapshot = (): void => {
  panelPorts.forEach((port) => {
    postSnapshotToPort(port);
  });
};

const persistSnapshot = async (): Promise<void> => {
  try {
    await chrome.storage.local.set<Record<string, PanelStateSnapshot>>({
      [PANEL_STATE_STORAGE_KEY]: createPanelSnapshot(),
    });
  } catch (error) {
    console.error("持久化后台会话状态失败", error);
  }
};

const schedulePersistSnapshot = (): void => {
  if (persistTimerId !== null) {
    clearTimeout(persistTimerId);
  }
  persistTimerId = setTimeout(() => {
    persistTimerId = null;
    void persistSnapshot();
  }, 200);
};

const setAgentStatus = (status: AgentStatus): void => {
  if (activeAgentStatus === status) {
    return;
  }
  activeAgentStatus = status;
  broadcastSnapshot();
  schedulePersistSnapshot();
};

const registerStateSubscriptions = (): void => {
  if (stateSubscriptionCleanups.length > 0) {
    return;
  }
  const subscribe = (key: keyof typeof state): void => {
    const cleanup = subscribeState(key, () => {
      broadcastSnapshot();
      schedulePersistSnapshot();
    });
    stateSubscriptionCleanups.push(cleanup);
  };
  subscribe("conversationId");
  subscribe("messages");
  subscribe("sending");
  subscribe("systemPrompt");
  subscribe("updatedAt");
};

const resolveStoredSnapshot = (
  rawValue: unknown,
): PanelStateSnapshot | null => {
  if (!isPanelStateSnapshot(rawValue)) {
    return null;
  }
  return rawValue;
};

const restorePersistedSnapshot = async (): Promise<void> => {
  let result: Record<string, unknown>;
  try {
    result = await chrome.storage.local.get<Record<string, unknown>>(
      PANEL_STATE_STORAGE_KEY,
    );
  } catch (error) {
    console.error("读取后台会话状态失败", error);
    return;
  }
  const snapshot = resolveStoredSnapshot(result[PANEL_STATE_STORAGE_KEY]);
  if (snapshot === null) {
    return;
  }
  setStateValue("conversationId", snapshot.conversationId, { type: "restore" });
  setMessages(snapshot.messages);
  setStateValue("updatedAt", snapshot.updatedAt, { type: "restore" });
  setStateValue("systemPrompt", snapshot.systemPrompt, { type: "restore" });
  setStateValue("sending", false, { type: "restore" });
  activeAgentStatus = AGENT_STATUS.idle;
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

const handleDeleteMessages = async (
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
      if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
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

const runConversationSend = async ({
  content,
  includePage,
}: {
  content: string;
  includePage: boolean;
}): Promise<void> => {
  const settings = await getSettings();
  if (!ensureSettingsReady(settings)) {
    setStateValue("sending", false, { type: "server" });
    setAgentStatus(AGENT_STATUS.idle);
    return;
  }
  const abortController = new AbortController();
  activeAbortController = abortController;
  try {
    await conversationManager.sendMessage({
      content,
      includePage,
      onStatusChange: (status: AgentStatus) => {
        setAgentStatus(status);
      },
      settings,
      signal: abortController.signal,
    });
  } catch (error) {
    console.error("后台发送会话消息失败", error);
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
    setStateValue("sending", false, { type: "server" });
    setAgentStatus(AGENT_STATUS.idle);
  }
};

const handleSendMessage = async (
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
  setAgentStatus(AGENT_STATUS.idle);
  void runConversationSend({
    content: normalizedContent,
    includePage: payload.includePage,
  });
  return { data: { accepted: true }, ok: true };
};

const handleStopSending = (): PanelServerCommandResponse<
  CommandDataMap["stopSending"]
> => {
  const current = activeAbortController;
  if (!current) {
    return { data: { stopped: false }, ok: true };
  }
  current.abort();
  return { data: { stopped: true }, ok: true };
};

const handleResetConversation = (): PanelServerCommandResponse<
  CommandDataMap["resetConversation"]
> => {
  ensureNotSending();
  resetConversation();
  setStateValue("sending", false, { type: "server" });
  setAgentStatus(AGENT_STATUS.idle);
  return { data: { reset: true }, ok: true };
};

const handleLoadConversation = async (
  payload: PanelServerCommandRequest<"loadConversation">["payload"],
): Promise<PanelServerCommandResponse<CommandDataMap["loadConversation"]>> => {
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
  setAgentStatus(AGENT_STATUS.idle);
  return { data: { loaded: true }, ok: true };
};

const handleDeleteConversation = async (
  payload: PanelServerCommandRequest<"deleteConversation">["payload"],
): Promise<
  PanelServerCommandResponse<CommandDataMap["deleteConversation"]>
> => {
  const conversationId = validateConversationId(payload.conversationId);
  await deleteConversation(conversationId);
  if (conversationId === state.conversationId) {
    resetConversation();
    setStateValue("sending", false, { type: "server" });
    setAgentStatus(AGENT_STATUS.idle);
  }
  return { data: { deleted: true }, ok: true };
};

const handleCommandRequest = async (
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

const registerCommandListener = (): void => {
  if (commandListenerReady) {
    return;
  }
  commandListenerReady = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isPanelServerCommandRequest(message)) {
      return false;
    }
    void handleCommandRequest(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error: unknown) => {
        console.error("处理 side panel 指令失败", error);
        sendResponse(
          createPanelCommandError(
            "internal",
            normalizeErrorMessage(error, "后台处理失败"),
          ),
        );
      });
    return true;
  });
};

const registerPortListener = (): void => {
  if (portListenerReady) {
    return;
  }
  portListenerReady = true;
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PANEL_SERVER_PORT_NAME) {
      return;
    }
    panelPorts.add(port);
    postSnapshotToPort(port);
    port.onDisconnect.addListener(() => {
      panelPorts.delete(port);
    });
  });
};

export const startPanelServer = async (): Promise<void> => {
  if (panelServerReady) {
    return;
  }
  panelServerReady = true;
  initTabListeners();
  try {
    await ensureOffscreenDocument();
  } catch (error) {
    console.error("初始化 offscreen 文档失败", error);
  }
  registerStateSubscriptions();
  registerPortListener();
  registerCommandListener();
  await restorePersistedSnapshot();
  broadcastSnapshot();
  schedulePersistSnapshot();
};
