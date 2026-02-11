import type { JsonValue } from "../../lib/utils/index.ts";
import { createRandomId } from "../../lib/utils/index.ts";

const SANDBOX_REQUEST_TYPE = "runConsoleCommand";
const SANDBOX_RESPONSE_TYPE = "runConsoleResult";

export type SandboxConsoleCommandRequest = {
  command: string;
};

type SandboxConsoleCommandMessage = {
  command: string;
  requestId: string;
  type: typeof SANDBOX_REQUEST_TYPE;
};

type SandboxConsoleCommandSuccessResponse = {
  ok: true;
  output: string;
  requestId: string;
  type: typeof SANDBOX_RESPONSE_TYPE;
};

type SandboxConsoleCommandErrorResponse = {
  error: string;
  ok: false;
  requestId: string;
  type: typeof SANDBOX_RESPONSE_TYPE;
};

export type SandboxConsoleCommandResponse =
  | SandboxConsoleCommandSuccessResponse
  | SandboxConsoleCommandErrorResponse;

type SandboxWindowProvider = () => Promise<Window | null>;

let sandboxWindowProvider: SandboxWindowProvider | null = null;

type RuntimeObject = Record<string, JsonValue>;

const successResponseKeys = new Set(["ok", "output", "requestId", "type"]);
const errorResponseKeys = new Set(["error", "ok", "requestId", "type"]);

const isRuntimeObject = (value: JsonValue): value is RuntimeObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOnlyKeys = (
  value: RuntimeObject,
  allowedKeys: ReadonlySet<string>,
): boolean => {
  return Object.keys(value).every((key) => allowedKeys.has(key));
};

const isNonEmptyString = (value: JsonValue): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isSandboxConsoleCommandResponse = (
  payload: JsonValue,
): payload is SandboxConsoleCommandResponse => {
  if (!isRuntimeObject(payload)) {
    return false;
  }
  if (
    payload.type !== SANDBOX_RESPONSE_TYPE ||
    !isNonEmptyString(payload.requestId) ||
    typeof payload.ok !== "boolean"
  ) {
    return false;
  }
  if (payload.ok) {
    if (!hasOnlyKeys(payload, successResponseKeys)) {
      return false;
    }
    return typeof payload.output === "string";
  }
  if (!hasOnlyKeys(payload, errorResponseKeys)) {
    return false;
  }
  return isNonEmptyString(payload.error);
};

const registerSandboxWindowProvider = (
  provider: SandboxWindowProvider,
): void => {
  if (typeof provider !== "function") {
    throw new Error("sandbox 窗口提供器无效");
  }
  sandboxWindowProvider = provider;
};

const getSandboxWindow = async (): Promise<Window> => {
  if (!sandboxWindowProvider) {
    throw new Error("sandbox 尚未初始化");
  }
  const targetWindow = await sandboxWindowProvider();
  if (!targetWindow) {
    throw new Error("sandbox 窗口不可用");
  }
  return targetWindow;
};

const sendMessageToSandbox = async (
  payload: SandboxConsoleCommandRequest,
  timeoutMs = 5000,
): Promise<SandboxConsoleCommandResponse> => {
  if (!isNonEmptyString(payload.command)) {
    throw new Error("command 必须是非空字符串");
  }
  const targetWindow = await getSandboxWindow();
  const requestId = createRandomId("sandbox");
  const requestMessage: SandboxConsoleCommandMessage = {
    command: payload.command,
    requestId,
    type: SANDBOX_REQUEST_TYPE,
  };
  return new Promise<SandboxConsoleCommandResponse>((resolve, reject) => {
    let timer = 0;
    const cleanup = (): void => {
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
    };
    const handleMessage = (event: MessageEvent<JsonValue>): void => {
      if (event.source !== targetWindow) {
        return;
      }
      const data = event.data;
      if (!isRuntimeObject(data) || data.type !== SANDBOX_RESPONSE_TYPE) {
        return;
      }
      if (data.requestId !== requestId) {
        return;
      }
      if (!isSandboxConsoleCommandResponse(data)) {
        cleanup();
        reject(new Error("sandbox 响应格式无效"));
        return;
      }
      cleanup();
      resolve(data);
    };
    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`等待 sandbox 响应超时（${String(timeoutMs)}ms）`));
    }, timeoutMs);
    window.addEventListener("message", handleMessage);
    targetWindow.postMessage(requestMessage, "*");
  });
};

export { registerSandboxWindowProvider };
export default sendMessageToSandbox;
