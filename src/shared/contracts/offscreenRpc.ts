export const OFFSCREEN_HEARTBEAT_TYPE = "offscreenHeartbeat";
export const OFFSCREEN_RUN_CONSOLE_TYPE = "offscreenRunConsole";

export type OffscreenHeartbeatMessage = {
  sentAt: number;
  type: typeof OFFSCREEN_HEARTBEAT_TYPE;
};

export type OffscreenRunConsoleRequest = {
  command: string;
  type: typeof OFFSCREEN_RUN_CONSOLE_TYPE;
};

export type OffscreenRunConsoleResponse =
  | {
      ok: true;
      output: string;
    }
  | {
      error: string;
      ok: false;
    };

type RuntimeObject = Record<string, unknown>;

const isRuntimeObject = (value: unknown): value is RuntimeObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isOffscreenHeartbeatMessage = (
  value: unknown,
): value is OffscreenHeartbeatMessage => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (value.type !== OFFSCREEN_HEARTBEAT_TYPE) {
    return false;
  }
  return typeof value.sentAt === "number" && Number.isFinite(value.sentAt);
};

export const isOffscreenRunConsoleRequest = (
  value: unknown,
): value is OffscreenRunConsoleRequest => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (value.type !== OFFSCREEN_RUN_CONSOLE_TYPE) {
    return false;
  }
  return typeof value.command === "string";
};

export const isOffscreenRunConsoleResponse = (
  value: unknown,
): value is OffscreenRunConsoleResponse => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (typeof value.ok !== "boolean") {
    return false;
  }
  if (value.ok) {
    return typeof value.output === "string";
  }
  return typeof value.error === "string" && value.error.trim().length > 0;
};
