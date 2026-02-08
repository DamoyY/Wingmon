import {
  reportSendStatus,
  requestSettingsCompletion,
  setSendUiState,
  syncComposerAfterSend,
} from "./sendUi.ts";
import { ConversationManager } from "./conversationManager.ts";
import { getPromptContent } from "../composerState.ts";

type SendMessageOptions = {
  includePage?: boolean;
};

const conversationManager = new ConversationManager();

conversationManager.subscribe((event) => {
  switch (event.type) {
    case "sending-change":
      setSendUiState(event.sending);
      break;
    case "status-change":
      reportSendStatus(event.status);
      break;
    case "settings-required":
      requestSettingsCompletion(event.settings);
      break;
    case "message-accepted":
      syncComposerAfterSend();
      break;
    default:
      console.error("未知会话事件", event);
  }
});

export const stopSending = async (): Promise<void> => {
  await conversationManager.stopSending();
};

export const sendMessage = async ({
  includePage = false,
}: SendMessageOptions = {}): Promise<void> => {
  const content = getPromptContent();
  if (!content) {
    return;
  }
  await conversationManager.sendMessage({ content, includePage });
};

export const sendMessageWithPage = (): Promise<void> =>
  sendMessage({ includePage: true });
