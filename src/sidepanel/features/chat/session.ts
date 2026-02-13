import { fadeOutMessages, resetMessagesFade } from "../../ui/index.ts";
import { requestResetConversation } from "../../core/server/index.ts";
import { state } from "../../../shared/state/panelStateContext.ts";

const handleNewChat = async (): Promise<void> => {
  if (state.sending) {
    return;
  }
  await fadeOutMessages();
  try {
    await requestResetConversation();
  } catch (error) {
    console.error("创建新会话失败", error);
  }
  resetMessagesFade();
};

export default handleNewChat;
