import {
  elements,
  fillSettingsForm,
  setText,
  showKeyView,
} from "../../../ui/index.ts";
import { state, updateMessage } from "../../../state/index.js";
import { renderMessagesView } from "./presenter.js";
import { clearPromptContent } from "../chat/composerState.js";
import {
  clearPromptInput,
  setComposerSending,
  updateComposerButtonsState,
} from "../chat/composerView.js";

type SettingsFormValues = Parameters<typeof fillSettingsForm>[0];
type MessageRecord = { role?: string; status?: string };
type MessageState = { messages: Array<MessageRecord | undefined> };

const normalizeStatusMessage = (message: unknown): string => {
  if (message === undefined || message === null) {
    return "";
  }
  if (typeof message !== "string") {
    throw new Error("状态内容必须为字符串");
  }
  return message;
};

const resolveStatusTargetIndex = (): number | null => {
  const { messages } = state as MessageState;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "assistant") {
      return i;
    }
  }
  return null;
};

const updateAssistantStatus = (index: number, status: string): void => {
  const { messages } = state as MessageState;
  const message = messages[index];
  if (!message) {
    console.error("未找到可更新的助手消息状态");
    return;
  }
  if (message.status === status) {
    return;
  }
  (updateMessage as (target: number, patch: Partial<MessageRecord>) => void)(
    index,
    { status },
  );
};

export const reportSendStatus = (message: unknown): void => {
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

export const promptSettingsCompletion = (
  settings: SettingsFormValues,
): void => {
  void showKeyView({ isFirstUse: true });
  fillSettingsForm(settings);
  const keyStatus = elements.keyStatus as HTMLElement | null;
  if (!keyStatus) {
    throw new Error("状态提示元素未初始化");
  }
  setText(keyStatus, "请先补全 API Key、Base URL 和模型");
};

export const syncComposerAfterSend = (): void => {
  (clearPromptContent as () => void)();
  (clearPromptInput as () => void)();
  (updateComposerButtonsState as () => void)();
  (renderMessagesView as () => void)();
};

export const setSendUiState = (sending: boolean): void => {
  (setComposerSending as (value: boolean) => void)(sending);
};
