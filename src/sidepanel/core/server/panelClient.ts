import {
  PANEL_SERVER_COMMAND_TYPE,
  PANEL_SERVER_PORT_NAME,
  type PanelAgentStatus,
  type PanelServerCommandErrorCode,
  type PanelServerCommandName,
  type PanelServerCommandPayloadMap,
  type PanelServerCommandRequest,
  type PanelServerCommandResponse,
  type PanelStateSnapshot,
  isPanelServerSnapshotMessage,
} from "../../../shared/index.ts";
import {
  setMessages,
  setStateValue,
} from "../../../shared/state/panelStateContext.ts";

const PANEL_RECONNECT_DELAY_MS = 1000;
const INITIAL_SNAPSHOT_TIMEOUT_MS = 3000;

type PanelAgentStatusListener = (status: PanelAgentStatus) => void;

let panelPort: chrome.runtime.Port | null = null;
let reconnectTimerId: number | null = null;
let hasReceivedSnapshot = false;
let resolveInitialSnapshot: (() => void) | null = null;
let activeAgentStatus: PanelAgentStatus = "idle";
const panelAgentStatusListeners = new Set<PanelAgentStatusListener>();

const initialSnapshotPromise = new Promise<void>((resolve) => {
  resolveInitialSnapshot = resolve;
});

export class PanelCommandError extends Error {
  code: PanelServerCommandErrorCode;

  constructor(code: PanelServerCommandErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PanelCommandError";
  }
}

const notifyPanelAgentStatusListener = (
  listener: PanelAgentStatusListener,
  status: PanelAgentStatus,
): void => {
  try {
    listener(status);
  } catch (error) {
    console.error("side panel 状态订阅回调执行失败", error);
  }
};

const emitPanelAgentStatus = (): void => {
  panelAgentStatusListeners.forEach((listener) => {
    notifyPanelAgentStatusListener(listener, activeAgentStatus);
  });
};

const setPanelAgentStatus = (status: PanelAgentStatus): void => {
  if (status === activeAgentStatus) {
    return;
  }
  activeAgentStatus = status;
  emitPanelAgentStatus();
};

const applySnapshot = (snapshot: PanelStateSnapshot): void => {
  setStateValue("conversationId", snapshot.conversationId, { type: "sync" });
  setMessages(snapshot.messages);
  setStateValue("updatedAt", snapshot.updatedAt, { type: "sync" });
  setStateValue("systemPrompt", snapshot.systemPrompt, { type: "sync" });
  setStateValue("sending", snapshot.sending, { type: "sync" });
  setPanelAgentStatus(snapshot.agentStatus);
};

const markSnapshotReceived = (): void => {
  if (hasReceivedSnapshot) {
    return;
  }
  hasReceivedSnapshot = true;
  if (resolveInitialSnapshot) {
    resolveInitialSnapshot();
    resolveInitialSnapshot = null;
  }
};

const scheduleReconnect = (): void => {
  if (reconnectTimerId !== null) {
    return;
  }
  reconnectTimerId = setTimeout(() => {
    reconnectTimerId = null;
    connectPanelServerPort();
  }, PANEL_RECONNECT_DELAY_MS);
};

const handlePortMessage = (message: unknown): void => {
  if (!isPanelServerSnapshotMessage(message)) {
    return;
  }
  applySnapshot(message.snapshot);
  markSnapshotReceived();
};

const handlePortDisconnect = (): void => {
  panelPort = null;
  scheduleReconnect();
};

const connectPanelServerPort = (): void => {
  if (panelPort) {
    return;
  }
  try {
    panelPort = chrome.runtime.connect({ name: PANEL_SERVER_PORT_NAME });
  } catch (error) {
    console.error("连接后台会话服务失败", error);
    scheduleReconnect();
    return;
  }
  panelPort.onMessage.addListener(handlePortMessage);
  panelPort.onDisconnect.addListener(handlePortDisconnect);
};

const sendPanelCommand = async <TCommand extends PanelServerCommandName>(
  command: TCommand,
  payload: PanelServerCommandPayloadMap[TCommand],
): Promise<PanelServerCommandResponse> => {
  const request: PanelServerCommandRequest<TCommand> = {
    command,
    payload,
    type: PANEL_SERVER_COMMAND_TYPE,
  };
  return chrome.runtime.sendMessage<
    PanelServerCommandRequest<TCommand>,
    PanelServerCommandResponse
  >(request);
};

const ensureCommandSuccess = <TData>(
  response: PanelServerCommandResponse<TData>,
): TData => {
  if (response.ok) {
    return response.data;
  }
  throw new PanelCommandError(response.code, response.error);
};

export const subscribePanelAgentStatus = (
  listener: PanelAgentStatusListener,
): (() => void) => {
  if (typeof listener !== "function") {
    throw new Error("状态订阅回调无效");
  }
  panelAgentStatusListeners.add(listener);
  notifyPanelAgentStatusListener(listener, activeAgentStatus);
  return () => {
    panelAgentStatusListeners.delete(listener);
  };
};

export const runPanelCommand = async <TCommand extends PanelServerCommandName>(
  command: TCommand,
  payload: PanelServerCommandPayloadMap[TCommand],
): Promise<void> => {
  const response = await sendPanelCommand(command, payload);
  ensureCommandSuccess(response);
};

export const runPanelCommandWithData = async <
  TCommand extends PanelServerCommandName,
  TData,
>(
  command: TCommand,
  payload: PanelServerCommandPayloadMap[TCommand],
): Promise<TData> => {
  const response = await sendPanelCommand(command, payload);
  return ensureCommandSuccess(response as PanelServerCommandResponse<TData>);
};

const waitForInitialSnapshot = async (): Promise<void> =>
  new Promise((resolve) => {
    const timerId = setTimeout(() => {
      if (!hasReceivedSnapshot) {
        console.error("等待后台会话状态超时");
      }
      resolve();
    }, INITIAL_SNAPSHOT_TIMEOUT_MS);
    void initialSnapshotPromise.finally(() => {
      clearTimeout(timerId);
      resolve();
    });
  });

export const initPanelServerClient = async (): Promise<void> => {
  connectPanelServerPort();
  await waitForInitialSnapshot();
};

export const requestSendMessage = async ({
  content,
  includePage,
}: {
  content: string;
  includePage: boolean;
}): Promise<void> => {
  await runPanelCommand("sendMessage", { content, includePage });
};

export const requestStopSending = async (): Promise<void> => {
  await runPanelCommand("stopSending", {});
};

export const requestResetConversation = async (): Promise<void> => {
  await runPanelCommand("resetConversation", {});
};

export const requestLoadConversation = async (
  conversationId: string,
): Promise<void> => {
  await runPanelCommand("loadConversation", { conversationId });
};

export const requestDeleteConversation = async (
  conversationId: string,
): Promise<void> => {
  await runPanelCommand("deleteConversation", { conversationId });
};

export const requestDeleteMessages = async (
  indices: number[],
): Promise<void> => {
  await runPanelCommand("deleteMessages", { indices });
};
