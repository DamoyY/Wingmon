import { AGENT_STATUS, type PanelAgentStatus } from "../../shared/index.ts";
import { ConversationManager } from "../conversation/index.ts";

export type StateSubscriptionCleanup = () => void;

export type PanelServerRuntimeState = {
  panelServerReady: boolean;
  commandListenerReady: boolean;
  portListenerReady: boolean;
  activeAbortController: AbortController | null;
  activeAgentStatus: PanelAgentStatus;
  panelPorts: Set<chrome.runtime.Port>;
  stateSubscriptionCleanups: StateSubscriptionCleanup[];
  conversationManager: ConversationManager;
};

export const panelServerRuntimeState: PanelServerRuntimeState = {
  activeAbortController: null,
  activeAgentStatus: AGENT_STATUS.idle,
  commandListenerReady: false,
  conversationManager: new ConversationManager(),
  panelPorts: new Set<chrome.runtime.Port>(),
  panelServerReady: false,
  portListenerReady: false,
  stateSubscriptionCleanups: [],
};
