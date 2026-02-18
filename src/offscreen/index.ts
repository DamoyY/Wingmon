import {
  OFFSCREEN_HEARTBEAT_TYPE,
  type OffscreenRunConsoleResponse,
  isOffscreenRunConsoleRequest,
} from "../shared/contracts/offscreenRpc.ts";

const SANDBOX_FRAME_ID = "wingmon-offscreen-sandbox";
const SANDBOX_REQUEST_TYPE = "runConsoleCommand";
const SANDBOX_RESPONSE_TYPE = "runConsoleResult";
const HEARTBEAT_INTERVAL_MS = 10000;
const SANDBOX_TIMEOUT_MS = 5000;

type RuntimeObject = Record<string, unknown>;

type SandboxResponseMessage =
  | {
      ok: true;
      output: string;
      requestId: string;
      type: typeof SANDBOX_RESPONSE_TYPE;
    }
  | {
      error: string;
      ok: false;
      requestId: string;
      type: typeof SANDBOX_RESPONSE_TYPE;
    };

let sandboxWindowPromise: Promise<Window> | null = null;

const isRuntimeObject = (value: unknown): value is RuntimeObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSandboxResponseMessage = (
  value: unknown,
): value is SandboxResponseMessage => {
  if (!isRuntimeObject(value)) {
    return false;
  }
  if (
    value.type !== SANDBOX_RESPONSE_TYPE ||
    typeof value.requestId !== "string" ||
    !value.requestId.trim() ||
    typeof value.ok !== "boolean"
  ) {
    return false;
  }
  if (value.ok) {
    return typeof value.output === "string";
  }
  return typeof value.error === "string" && value.error.trim().length > 0;
};

const createSandboxFrame = (): HTMLIFrameElement => {
  const existing = document.getElementById(SANDBOX_FRAME_ID);
  if (existing instanceof HTMLIFrameElement) {
    return existing;
  }
  if (existing) {
    existing.remove();
  }
  const frame = document.createElement("iframe");
  frame.id = SANDBOX_FRAME_ID;
  frame.src = chrome.runtime.getURL("sandbox.html");
  frame.style.display = "none";
  document.body.append(frame);
  return frame;
};

const ensureSandboxWindow = async (): Promise<Window> => {
  if (sandboxWindowPromise !== null) {
    return sandboxWindowPromise;
  }
  sandboxWindowPromise = new Promise<Window>((resolve, reject) => {
    const frame = createSandboxFrame();
    const currentWindow = frame.contentWindow;
    const isLoaded = frame.contentDocument?.readyState === "complete";
    if (currentWindow !== null && isLoaded) {
      resolve(currentWindow);
      return;
    }
    frame.addEventListener(
      "load",
      () => {
        const loadedWindow = frame.contentWindow;
        if (!loadedWindow) {
          reject(new Error("无法获取 sandbox 窗口"));
          return;
        }
        resolve(loadedWindow);
      },
      { once: true },
    );
  }).catch((error: unknown) => {
    sandboxWindowPromise = null;
    throw error;
  });
  return sandboxWindowPromise;
};

const runConsoleInSandbox = async (
  command: string,
): Promise<OffscreenRunConsoleResponse> => {
  const normalized = command.trim();
  if (!normalized) {
    return {
      error: "command 必须是非空字符串",
      ok: false,
    };
  }
  const targetWindow = await ensureSandboxWindow();
  const requestId = crypto.randomUUID();
  const requestPayload = {
    command: normalized,
    requestId,
    type: SANDBOX_REQUEST_TYPE,
  };
  return new Promise<OffscreenRunConsoleResponse>((resolve) => {
    let timerId: number | null = null;
    const cleanup = (): void => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      window.removeEventListener("message", handleMessage);
    };
    const handleMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== targetWindow) {
        return;
      }
      if (!isSandboxResponseMessage(event.data)) {
        return;
      }
      if (event.data.requestId !== requestId) {
        return;
      }
      cleanup();
      if (event.data.ok) {
        resolve({
          ok: true,
          output: event.data.output,
        });
        return;
      }
      resolve({
        error: event.data.error,
        ok: false,
      });
    };
    window.addEventListener("message", handleMessage);
    timerId = setTimeout(() => {
      cleanup();
      resolve({
        error: `等待 sandbox 响应超时（${String(SANDBOX_TIMEOUT_MS)}ms）`,
        ok: false,
      });
    }, SANDBOX_TIMEOUT_MS);
    targetWindow.postMessage(requestPayload, "*");
  });
};

const sendHeartbeat = async (): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({
      sentAt: Date.now(),
      type: OFFSCREEN_HEARTBEAT_TYPE,
    });
  } catch (error) {
    console.error("发送 offscreen 心跳失败", error);
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isOffscreenRunConsoleRequest(message)) {
    return false;
  }
  void runConsoleInSandbox(message.command)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.error("offscreen 执行失败", error);
        sendResponse({
          error: error.message || "offscreen 执行失败",
          ok: false,
        } satisfies OffscreenRunConsoleResponse);
        return;
      }
      console.error("offscreen 执行失败", error);
      sendResponse({
        error: "offscreen 执行失败",
        ok: false,
      } satisfies OffscreenRunConsoleResponse);
    });
  return true;
});

void ensureSandboxWindow();
void sendHeartbeat();
setInterval(() => {
  void sendHeartbeat();
}, HEARTBEAT_INTERVAL_MS);
