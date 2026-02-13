import createRandomId from "../utils/createRandomId.ts";
import { createPanelStateStore } from "./panelStateStore.ts";

export type {
  MessageInput,
  MessageRecord,
  PanelState,
  StateChangePayload,
} from "./panelStateStore.ts";

const panelStateStore = createPanelStateStore(createRandomId);

export const {
  addMessage,
  appendAssistantDelta,
  loadConversationState,
  removeMessage,
  resetConversation,
  setMessages,
  setStateValue,
  state,
  subscribeState,
  touchUpdatedAt,
  updateMessage,
} = panelStateStore;
