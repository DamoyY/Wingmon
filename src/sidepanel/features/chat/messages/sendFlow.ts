import {
  PanelCommandError,
  requestSendMessage,
  requestStopSending,
} from "../../../core/server/index.ts";
import { requestSettingsCompletion, syncComposerAfterSend } from "./sendUi.ts";
import { ensureSettingsReady } from "../../settings/model.ts";
import { getPromptContent } from "../composerState.ts";
import { getSettings } from "../../../../shared/index.ts";
import { state } from "../../../../shared/state/panelStateContext.ts";

type SendMessageOptions = { includePage?: boolean };

const resolveNotReadyError = (
  error: unknown,
  settings: Awaited<ReturnType<typeof getSettings>>,
): boolean => {
  if (!(error instanceof PanelCommandError)) {
    return false;
  }
  if (error.code !== "not_ready") {
    return false;
  }
  requestSettingsCompletion(settings);
  return true;
};

export const stopSending = async (): Promise<void> => {
  if (!state.sending) {
    return;
  }
  try {
    await requestStopSending();
  } catch (error) {
    console.error("停止发送失败", error);
  }
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
  const settings = await getSettings();
  if (!ensureSettingsReady(settings)) {
    requestSettingsCompletion(settings);
    return;
  }
  try {
    await requestSendMessage({ content, includePage });
    syncComposerAfterSend();
  } catch (error) {
    if (resolveNotReadyError(error, settings)) {
      return;
    }
    console.error("发送消息失败", error);
  }
};

export const sendMessageWithPage = (): Promise<void> =>
  sendMessage({ includePage: true });
