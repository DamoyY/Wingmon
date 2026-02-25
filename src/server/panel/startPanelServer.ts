import {
  AGENT_STATUS,
  PANEL_SERVER_PORT_NAME,
  type AgentStatus,
  isPanelServerCommandRequest,
  createPanelCommandError,
} from "../../shared/index.ts";
import { state, subscribeState } from "../../shared/state/panelStateContext.ts";
import {
  initTabListeners,
  setFocusRippleEnabled,
  setFocusRippleProcessingTab,
} from "../services/index.ts";
import { ensureOffscreenDocument } from "../offscreenDocument.ts";
import { createActionIconCycleController } from "./actionIconCycle.ts";
import { createPanelCommandRequestHandler } from "./commandHandling.ts";
import { normalizeErrorMessage } from "./errorText.ts";
import { notifyAssistantReplyWhenSidePanelClosed } from "./replyNotification.ts";
import { panelServerRuntimeState } from "./runtimeState.ts";
import { createPanelSnapshotSync } from "./snapshotSync.ts";

const actionIconCycle = createActionIconCycleController();

const snapshotSync = createPanelSnapshotSync({
  getAgentStatus: () => panelServerRuntimeState.activeAgentStatus,
  onSnapshotRestored: () => {
    panelServerRuntimeState.activeAgentStatus = AGENT_STATUS.idle;
  },
});

const setAgentStatus = (status: AgentStatus): void => {
  if (panelServerRuntimeState.activeAgentStatus === status) {
    return;
  }
  panelServerRuntimeState.activeAgentStatus = status;
  snapshotSync.broadcastSnapshot(panelServerRuntimeState.panelPorts);
  snapshotSync.schedulePersistSnapshot();
};

const syncSendingStateEffects = (sending: boolean): void => {
  actionIconCycle.sync(sending);
  setFocusRippleEnabled(sending);
  if (!sending) {
    setFocusRippleProcessingTab(null);
  }
};

const handleCommandRequest = createPanelCommandRequestHandler({
  conversationManager: panelServerRuntimeState.conversationManager,
  getActiveAbortController: () => panelServerRuntimeState.activeAbortController,
  notifyReplyWhenPanelClosed: async (replyContent: string): Promise<void> =>
    notifyAssistantReplyWhenSidePanelClosed(
      replyContent,
      () => panelServerRuntimeState.panelPorts.size === 0,
    ),
  setActiveAbortController: (controller: AbortController | null): void => {
    panelServerRuntimeState.activeAbortController = controller;
  },
  setAgentStatus,
});

const registerStateSubscriptions = (): void => {
  if (panelServerRuntimeState.stateSubscriptionCleanups.length > 0) {
    return;
  }
  const subscribe = (key: keyof typeof state): void => {
    const cleanup = subscribeState(key, () => {
      if (key === "sending") {
        syncSendingStateEffects(state.sending);
      }
      snapshotSync.broadcastSnapshot(panelServerRuntimeState.panelPorts);
      snapshotSync.schedulePersistSnapshot();
    });
    panelServerRuntimeState.stateSubscriptionCleanups.push(cleanup);
  };
  subscribe("conversationId");
  subscribe("messages");
  subscribe("sending");
  subscribe("systemPrompt");
  subscribe("updatedAt");
};

const registerPortListener = (): void => {
  if (panelServerRuntimeState.portListenerReady) {
    return;
  }
  panelServerRuntimeState.portListenerReady = true;
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PANEL_SERVER_PORT_NAME) {
      return;
    }
    panelServerRuntimeState.panelPorts.add(port);
    snapshotSync.postSnapshotToPort(port);
    port.onDisconnect.addListener(() => {
      panelServerRuntimeState.panelPorts.delete(port);
    });
  });
};

const registerCommandListener = (): void => {
  if (panelServerRuntimeState.commandListenerReady) {
    return;
  }
  panelServerRuntimeState.commandListenerReady = true;
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

export const startPanelServer = async (): Promise<void> => {
  if (panelServerRuntimeState.panelServerReady) {
    return;
  }
  panelServerRuntimeState.panelServerReady = true;
  initTabListeners();
  registerStateSubscriptions();
  registerPortListener();
  registerCommandListener();
  try {
    await ensureOffscreenDocument();
  } catch (error) {
    console.error("初始化 offscreen 文档失败", error);
  }
  try {
    await actionIconCycle.ensureFramesPreloaded();
  } catch (error) {
    console.error("初始化扩展图标帧失败", error);
  }
  await snapshotSync.restorePersistedSnapshot();
  syncSendingStateEffects(state.sending);
  snapshotSync.broadcastSnapshot(panelServerRuntimeState.panelPorts);
  snapshotSync.schedulePersistSnapshot();
};
