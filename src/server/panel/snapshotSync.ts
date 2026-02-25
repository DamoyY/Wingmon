import {
  PANEL_SERVER_SNAPSHOT_TYPE,
  type PanelAgentStatus,
  type PanelMessageRecord,
  type PanelServerSnapshotMessage,
  type PanelStateSnapshot,
  isPanelStateSnapshot,
} from "../../shared/index.ts";
import {
  type MessageRecord,
  setMessages,
  setStateValue,
  state,
} from "../../shared/state/panelStateContext.ts";

const panelStateStorageKey = "panel_server_state";

type SnapshotSyncDependencies = {
  getAgentStatus: () => PanelAgentStatus;
  onSnapshotRestored: () => void;
};

export type PanelSnapshotSync = {
  postSnapshotToPort: (port: chrome.runtime.Port) => void;
  broadcastSnapshot: (ports: Set<chrome.runtime.Port>) => void;
  schedulePersistSnapshot: () => void;
  restorePersistedSnapshot: () => Promise<void>;
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

const resolveStoredSnapshot = (
  rawValue: unknown,
): PanelStateSnapshot | null => {
  if (!isPanelStateSnapshot(rawValue)) {
    return null;
  }
  return rawValue;
};

export const createPanelSnapshotSync = (
  dependencies: SnapshotSyncDependencies,
): PanelSnapshotSync => {
  let persistTimerId: number | null = null;

  const createPanelSnapshot = (): PanelStateSnapshot => ({
    agentStatus: dependencies.getAgentStatus(),
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

  const broadcastSnapshot = (ports: Set<chrome.runtime.Port>): void => {
    ports.forEach((port) => {
      postSnapshotToPort(port);
    });
  };

  const persistSnapshot = async (): Promise<void> => {
    try {
      await chrome.storage.local.set<Record<string, PanelStateSnapshot>>({
        [panelStateStorageKey]: createPanelSnapshot(),
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

  const restorePersistedSnapshot = async (): Promise<void> => {
    let result: Record<string, unknown>;
    try {
      result =
        await chrome.storage.local.get<Record<string, unknown>>(
          panelStateStorageKey,
        );
    } catch (error) {
      console.error("读取后台会话状态失败", error);
      return;
    }
    const snapshot = resolveStoredSnapshot(result[panelStateStorageKey]);
    if (snapshot === null) {
      return;
    }
    setStateValue("conversationId", snapshot.conversationId, {
      type: "restore",
    });
    setMessages(snapshot.messages);
    setStateValue("updatedAt", snapshot.updatedAt, { type: "restore" });
    setStateValue("systemPrompt", snapshot.systemPrompt, { type: "restore" });
    setStateValue("sending", false, { type: "restore" });
    dependencies.onSnapshotRestored();
  };

  return {
    broadcastSnapshot,
    postSnapshotToPort,
    restorePersistedSnapshot,
    schedulePersistSnapshot,
  };
};
