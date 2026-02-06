import {
  elements,
  fillSettingsForm,
  setText,
  showKeyView,
} from "../../../ui/index.ts";
import { state, updateMessage } from "../../../core/store/index.ts";
import { renderMessagesView } from "./presenter.ts";
import { clearPromptContent } from "../composerState.ts";
import {
  clearPromptInput,
  setComposerSending,
  updateComposerButtonsState,
} from "../composerView.ts";

type SettingsFormValues = Parameters<typeof fillSettingsForm>[0];

const normalizeStatusMessage = (message: string | null | undefined): string => {
  if (message === undefined || message === null) {
    return "";
  }
  return message;
};

const resolveStatusTargetIndex = (): number | null => {
  const { messages } = state;
  let lastAssistantIndex: number | null = null;
  let lastVisibleAssistantIndex: number | null = null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") {
      continue;
    }
    const isHidden = message.hidden === true;
    if (message.pending === true && !isHidden) {
      return i;
    }
    if (lastAssistantIndex === null) {
      lastAssistantIndex = i;
    }
    if (!isHidden && lastVisibleAssistantIndex === null) {
      lastVisibleAssistantIndex = i;
    }
  }
  return lastVisibleAssistantIndex ?? lastAssistantIndex;
};

const updateAssistantStatus = (index: number, status: string): void => {
  const { messages } = state;
  if (index < 0 || index >= messages.length) {
    console.error("未找到可更新的助手消息状态");
    return;
  }
  const message = messages[index];
  if (message.status === status) {
    return;
  }
  updateMessage(index, { status });
};

export const reportSendStatus = (message: string | null | undefined): void => {
  const normalizedMessage = normalizeStatusMessage(message);
  const targetIndex = resolveStatusTargetIndex();
  if (targetIndex === null) {
    if (normalizedMessage) {
      console.error("未找到可更新的助手消息状态");
    }
    return;
  }
  updateAssistantStatus(targetIndex, normalizedMessage);
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
