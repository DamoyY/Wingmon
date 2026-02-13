import {
  OFFSCREEN_RUN_CONSOLE_TYPE,
  type OffscreenRunConsoleRequest,
  isOffscreenRunConsoleResponse,
} from "../contracts/offscreenRpc.ts";

export type SandboxConsoleCommandRequest = {
  command: string;
};

type SandboxConsoleCommandSuccessResponse = {
  ok: true;
  output: string;
};

type SandboxConsoleCommandErrorResponse = {
  error: string;
  ok: false;
};

export type SandboxConsoleCommandResponse =
  | SandboxConsoleCommandSuccessResponse
  | SandboxConsoleCommandErrorResponse;

const DEFAULT_TIMEOUT_MS = 5000;

const ensureCommand = (command: string): string => {
  if (typeof command !== "string") {
    throw new Error("command 必须是字符串");
  }
  const normalized = command.trim();
  if (!normalized) {
    throw new Error("command 必须是非空字符串");
  }
  return normalized;
};

const ensureTimeoutMs = (timeoutMs: number): number => {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs 必须是正整数");
  }
  return timeoutMs;
};

const requestOffscreenRunConsole = async (
  payload: OffscreenRunConsoleRequest,
  timeoutMs: number,
): Promise<SandboxConsoleCommandResponse> => {
  const request = chrome.runtime.sendMessage<
    OffscreenRunConsoleRequest,
    unknown
  >(payload);
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`等待 offscreen 响应超时（${String(timeoutMs)}ms）`));
    }, timeoutMs);
  });
  const response = await Promise.race([request, timeoutPromise]);
  if (!isOffscreenRunConsoleResponse(response)) {
    throw new Error("offscreen 响应格式无效");
  }
  return response;
};

const sendMessageToSandbox = async (
  payload: SandboxConsoleCommandRequest,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SandboxConsoleCommandResponse> => {
  const normalizedCommand = ensureCommand(payload.command);
  const resolvedTimeout = ensureTimeoutMs(timeoutMs);
  return requestOffscreenRunConsole(
    { command: normalizedCommand, type: OFFSCREEN_RUN_CONSOLE_TYPE },
    resolvedTimeout,
  );
};

export default sendMessageToSandbox;
