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
import { clearPromptContent } from "../composerState.ts";
import { renderMessagesView } from "./presenter.ts";
import { setStateValue } from "../../../core/store/index.ts";
type SettingsFormValues = Parameters<typeof fillSettingsForm>[0];

const normalizeStatusMessage = (
  message: string | null | undefined,
): string | null => {
  if (message === undefined || message === null) {
    return null;
  }
  if (message.length === 0) {
    return null;
  }
  return message;
};

export const reportSendStatus = (message: string | null | undefined): void => {
  setStateValue("activeStatus", normalizeStatusMessage(message));
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
