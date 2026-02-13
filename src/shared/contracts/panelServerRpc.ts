import { AGENT_STATUS, type AgentStatus } from "./agentStatus.ts";
import {
  isJsonObject,
  isJsonSchemaValue,
  isJsonValue,
  type JsonSchema,
} from "../utils/runtimeValidation.ts";
import {
  isMessageRecordValue,
  panelMessageRecordSchema,
  type MessageFieldValue,
  type MessageRecord,
} from "../state/panelStateStore.ts";
export const PANEL_SERVER_PORT_NAME = "wingmon-panel-server-port";
export const PANEL_SERVER_COMMAND_TYPE = "panelServerCommand";
export const PANEL_SERVER_SNAPSHOT_TYPE = "panelServerSnapshot";

export const panelAgentStatuses = [
  AGENT_STATUS.idle,
  AGENT_STATUS.thinking,
  AGENT_STATUS.speaking,
  AGENT_STATUS.browsing,
  AGENT_STATUS.searching,
  AGENT_STATUS.operating,
  AGENT_STATUS.coding,
] as const satisfies readonly AgentStatus[];

export type PanelAgentStatus = AgentStatus;

export type PanelMessageFieldValue = MessageFieldValue;

export type PanelMessageRecord = MessageRecord;

export type PanelStateSnapshot = {
  conversationId: string;
  messages: PanelMessageRecord[];
  updatedAt: number;
  sending: boolean;
  systemPrompt: string | null;
  agentStatus: PanelAgentStatus;
};

export type PanelServerCommandPayloadMap = {
  sendMessage: {
    content: string;
    includePage: boolean;
  };
  stopSending: Record<string, never>;
  resetConversation: Record<string, never>;
  loadConversation: {
    conversationId: string;
  };
  deleteConversation: {
    conversationId: string;
  };
  deleteMessages: {
    indices: number[];
  };
};

export type PanelServerCommandName = keyof PanelServerCommandPayloadMap;

export type PanelServerCommandRequest<
  TCommand extends PanelServerCommandName = PanelServerCommandName,
> = {
  type: typeof PANEL_SERVER_COMMAND_TYPE;
  command: TCommand;
  payload: PanelServerCommandPayloadMap[TCommand];
};

export type PanelServerCommandSuccessResponse<TData = undefined> = {
  ok: true;
  data: TData;
};

export type PanelServerCommandErrorCode =
  | "busy"
  | "invalid_payload"
  | "not_ready"
  | "not_found"
  | "internal";

export type PanelServerCommandErrorResponse = {
  ok: false;
  code: PanelServerCommandErrorCode;
  error: string;
};

export type PanelServerCommandResponse<TData = undefined> =
  | PanelServerCommandSuccessResponse<TData>
  | PanelServerCommandErrorResponse;

export type PanelServerSnapshotMessage = {
  type: typeof PANEL_SERVER_SNAPSHOT_TYPE;
  snapshot: PanelStateSnapshot;
};

type RuntimeObject = Record<string, unknown>;

const isRuntimeObject = (value: unknown): value is RuntimeObject =>
  isJsonObject(value);

const panelStateSnapshotSchema: JsonSchema = {
  properties: {
    agentStatus: { type: "string" },
    conversationId: {
      pattern: String.raw`\S`,
      type: "string",
    },
    messages: {
      items: panelMessageRecordSchema,
      type: "array",
    },
    sending: { type: "boolean" },
    systemPrompt: { type: ["null", "string"] },
    updatedAt: { type: "number" },
  },
  required: [
    "conversationId",
    "messages",
    "updatedAt",
    "sending",
    "systemPrompt",
    "agentStatus",
  ],
  type: "object",
};

const isPanelAgentStatus = (value: unknown): value is PanelAgentStatus => {
  if (typeof value !== "string") {
    return false;
  }
  return panelAgentStatuses.some((status) => status === value);
};

export const isPanelStateSnapshot = (
  value: unknown,
): value is PanelStateSnapshot => {
  if (!isJsonValue(value) || !isRuntimeObject(value)) {
    return false;
  }
  if (!isJsonSchemaValue(value, panelStateSnapshotSchema)) {
    return false;
  }
  if (!Array.isArray(value.messages)) {
    return false;
  }
  if (!value.messages.every(isMessageRecordValue)) {
    return false;
  }
  return isPanelAgentStatus(value.agentStatus);
};

export const isPanelServerSnapshotMessage = (
  value: unknown,
): value is PanelServerSnapshotMessage => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (value.type !== PANEL_SERVER_SNAPSHOT_TYPE) {
    return false;
  }
  return isPanelStateSnapshot(value.snapshot);
};

export const isPanelServerCommandRequest = (
  value: unknown,
): value is PanelServerCommandRequest => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (value.type !== PANEL_SERVER_COMMAND_TYPE) {
    return false;
  }
  if (typeof value.command !== "string") {
    return false;
  }
  const allowedCommands = new Set<PanelServerCommandName>([
    "sendMessage",
    "stopSending",
    "resetConversation",
    "loadConversation",
    "deleteConversation",
    "deleteMessages",
  ]);
  if (!allowedCommands.has(value.command as PanelServerCommandName)) {
    return false;
  }
  if (!isRuntimeObject(value.payload)) {
    return false;
  }
  return true;
};

export const createPanelCommandError = (
  code: PanelServerCommandErrorCode,
  error: string,
): PanelServerCommandErrorResponse => ({
  code,
  error,
  ok: false,
});
