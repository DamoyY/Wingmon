import {
  AGENT_STATUS,
  type AgentStatus,
} from "../../../core/agent/toolResultFormatters.ts";
import { type Settings, getSettings } from "../../../core/services/index.ts";
import {
  reportSendStatus,
  requestSettingsCompletion,
  setSendUiState,
  syncComposerAfterSend,
} from "./sendUi.ts";
import { setStateValue, state } from "../../../core/store/index.ts";
import { ConversationManager } from "./conversationManager.ts";
import { ensureSettingsReady } from "../../settings/model.ts";
import { getPromptContent } from "../composerState.ts";

type SendMessageOptions = {
  includePage?: boolean;
};

const conversationManager = new ConversationManager();
let activeAbortController: AbortController | null = null;
let shouldIgnoreStatusUpdates = false;

const beginSendCycle = (): AbortController => {
    const abortController = new AbortController();
    activeAbortController = abortController;
    shouldIgnoreStatusUpdates = false;
    setStateValue("sending", true);
    setSendUiState(true);
    reportSendStatus(AGENT_STATUS.idle);
    return abortController;
  },
  completeSendCycle = (abortController: AbortController): void => {
    setStateValue("sending", false);
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
    shouldIgnoreStatusUpdates = false;
    setSendUiState(false);
    reportSendStatus(AGENT_STATUS.idle);
  },
  reportConversationStatus = (status: AgentStatus): void => {
    if (shouldIgnoreStatusUpdates) {
      return;
    }
    reportSendStatus(status);
  },
  getReadySettings = async (): Promise<Settings | null> => {
    const settings = await getSettings();
    if (!ensureSettingsReady(settings)) {
      requestSettingsCompletion(settings);
      return null;
    }
    return settings;
  };

export const stopSending = (): Promise<void> => {
  const abortController = activeAbortController;
  if (!abortController) {
    return Promise.resolve();
  }
  shouldIgnoreStatusUpdates = true;
  setSendUiState(false);
  reportSendStatus(AGENT_STATUS.idle);
  abortController.abort();
  return Promise.resolve();
};

export const sendMessage = async ({
  includePage = false,
}: SendMessageOptions = {}): Promise<void> => {
  if (state.sending) {
    return;
  }
  const content = getPromptContent();
  if (!content) {
    return;
  }
  const settings = await getReadySettings();
  if (!settings) {
    return;
  }
  const abortController = beginSendCycle();
  try {
    await conversationManager.sendMessage({
      content,
      includePage,
      onMessageAccepted: () => {
        syncComposerAfterSend();
      },
      onStatusChange: (status: AgentStatus) => {
        reportConversationStatus(status);
      },
      settings,
      signal: abortController.signal,
    });
  } finally {
    completeSendCycle(abortController);
  }
};

export const sendMessageWithPage = (): Promise<void> =>
  sendMessage({ includePage: true });
