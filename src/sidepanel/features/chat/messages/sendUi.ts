import { AGENT_STATUS, type AgentStatus } from "../../../../shared/index.ts";
import {
  clearPromptInput,
  setComposerSending,
  updateComposerButtonsState,
} from "../composerView.ts";
import {
  elements,
  fillSettingsForm,
  setText,
  showKeyView,
} from "../../../ui/index.ts";
import {
  setStateValue,
  state,
  subscribeState,
} from "../../../../shared/state/panelStateContext.ts";
import { clearPromptContent } from "../composerState.ts";
import { renderMessagesView } from "./presenter.ts";
import { t } from "../../../lib/utils/index.ts";
import { subscribePanelAgentStatus } from "../../../core/server/index.ts";

type SettingsFormValues = Parameters<typeof fillSettingsForm>[0];

type ActiveAgentStatus = Exclude<AgentStatus, typeof AGENT_STATUS.idle>;

const STATUS_DOT_INTERVAL_MS = 360;
const STATUS_DOT_COUNT_MAX = 3;

const STATUS_TEXT_KEY_MAP: Record<ActiveAgentStatus, string> = {
  browsing: "statusBrowsing",
  coding: "statusCoding",
  operating: "statusOperating",
  searching: "statusSearching",
  speaking: "statusSpeaking",
  thinking: "statusThinking",
};

let activeStatus: AgentStatus = AGENT_STATUS.idle;
let dotCount = 0;
let dotTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeSendingState: (() => void) | null = null;
let unsubscribePanelAgentStatus: (() => void) | null = null;

const stopStatusAnimation = (): void => {
  if (dotTimer === null) {
    return;
  }
  clearInterval(dotTimer);
  dotTimer = null;
};

const setActiveStatusText = (message: string | null): void => {
  setStateValue("activeStatus", message);
};

const resolveStatusTextKey = (status: ActiveAgentStatus): string => {
  const key = STATUS_TEXT_KEY_MAP[status];
  if (!key) {
    throw new Error(`未知状态：${status}`);
  }
  return key;
};

const buildAnimatedStatusText = (
  status: ActiveAgentStatus,
  nextDotCount: number,
): string => {
  const key = resolveStatusTextKey(status);
  const baseText = t(key).trimEnd();
  if (!baseText) {
    throw new Error(`状态文案缺失：${key}`);
  }
  return `${baseText}${".".repeat(nextDotCount)}`;
};

const renderStatusFrame = (): void => {
  if (activeStatus === AGENT_STATUS.idle) {
    setActiveStatusText(null);
    return;
  }
  dotCount = (dotCount % STATUS_DOT_COUNT_MAX) + 1;
  setActiveStatusText(buildAnimatedStatusText(activeStatus, dotCount));
};

const startStatusAnimation = (): void => {
  if (activeStatus === AGENT_STATUS.idle || dotTimer !== null) {
    return;
  }
  dotTimer = setInterval(() => {
    renderStatusFrame();
  }, STATUS_DOT_INTERVAL_MS);
};

const updateStatus = (status: AgentStatus): void => {
  if (status === activeStatus) {
    return;
  }
  stopStatusAnimation();
  activeStatus = status;
  dotCount = 0;
  if (status === AGENT_STATUS.idle) {
    setActiveStatusText(null);
    return;
  }
  renderStatusFrame();
  startStatusAnimation();
};

const bindAgentStatusToStore = (): void => {
  if (unsubscribePanelAgentStatus) {
    return;
  }
  unsubscribePanelAgentStatus = subscribePanelAgentStatus((status) => {
    updateStatus(status);
  });
};

export const reportSendStatus = (status: AgentStatus): void => {
  updateStatus(status);
};

export const requestSettingsCompletion = (
  settings: SettingsFormValues,
): void => {
  void showKeyView({ isFirstUse: true });
  fillSettingsForm(settings);
  setText(elements.keyStatus, "请先补全 API Key、Base URL 和模型");
};

export const syncComposerAfterSend = (): void => {
  clearPromptContent();
  clearPromptInput();
  updateComposerButtonsState();
  renderMessagesView();
};

export const setSendUiState = (sending: boolean): void => {
  setComposerSending(sending);
};

export const bindSendStateToStore = (): void => {
  bindAgentStatusToStore();
  if (unsubscribeSendingState) {
    return;
  }
  unsubscribeSendingState = subscribeState("sending", () => {
    setComposerSending(state.sending);
  });
  setComposerSending(state.sending);
};
