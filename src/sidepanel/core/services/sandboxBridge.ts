import type { JsonValue } from "../../lib/utils/index.ts";
import { createRandomId } from "../../lib/utils/index.ts";

const SANDBOX_REQUEST_TYPE = "runConsoleCommand";
const SANDBOX_RESPONSE_TYPE = "runConsoleResult";

type SandboxRequestPayload = Record<string, JsonValue>;
type SandboxResponsePayload = {
  type?: string;
  requestId?: string;
  error?: string;
} & Record<string, JsonValue>;

type SandboxWindowProvider = () => Promise<Window | null>;

let sandboxWindowProvider: SandboxWindowProvider | null = null;

const isSandboxResponsePayload = (
  payload: Record<string, JsonValue> | null,
): payload is SandboxResponsePayload => {
  if (!payload) {
    return false;
  }
  return payload.type === SANDBOX_RESPONSE_TYPE;
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
  payload: SandboxRequestPayload,
  timeoutMs = 5000,
): Promise<SandboxResponsePayload> => {
  const targetWindow = await getSandboxWindow();
  const requestId = createRandomId("sandbox");
  return new Promise<SandboxResponsePayload>((resolve, reject) => {
    let timer = 0;
    const handleMessage = (
      event: MessageEvent<Record<string, JsonValue> | null>,
    ): void => {
      if (event.source !== targetWindow) {
        return;
      }
      const data = event.data;
      if (!isSandboxResponsePayload(data)) {
        return;
      }
      if (data.requestId !== requestId) {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      if (typeof data.error === "string" && data.error.trim()) {
        reject(new Error(data.error));
        return;
      }
      resolve(data);
    };
    timer = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error(`等待 sandbox 响应超时（${String(timeoutMs)}ms）`));
    }, timeoutMs);
    window.addEventListener("message", handleMessage);
    targetWindow.postMessage(
      { ...payload, requestId, type: SANDBOX_REQUEST_TYPE },
      "*",
    );
  });
};

export { registerSandboxWindowProvider };
export default sendMessageToSandbox;
