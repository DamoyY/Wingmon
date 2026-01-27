import { createRandomId } from "../utils/index.js";

const SANDBOX_FRAME_ID = "llm-sandbox-frame";
const SANDBOX_RESPONSE_TYPE = "runConsoleResult";
const SANDBOX_REQUEST_TYPE = "runConsoleCommand";
const SANDBOX_LOAD_TIMEOUT = 5000;
let sandboxReadyPromise = null;
let sandboxWindow = null;
const ensureSandboxFrame = () => {
  if (!document?.body) {
    throw new Error("面板尚未就绪，无法创建 sandbox");
  }
  const existing = document.getElementById(SANDBOX_FRAME_ID);
  if (existing) {
    return existing;
  }
  const frame = document.createElement("iframe");
  frame.id = SANDBOX_FRAME_ID;
  frame.src = chrome.runtime.getURL("public/sandbox.html");
  frame.style.display = "none";
  document.body.appendChild(frame);
  return frame;
};
const getSandboxWindow = async () => {
  if (sandboxWindow) {
    return sandboxWindow;
  }
  if (!sandboxReadyPromise) {
    sandboxReadyPromise = new Promise((resolve, reject) => {
      const frame = ensureSandboxFrame();
      const timer = setTimeout(() => {
        sandboxReadyPromise = null;
        reject(new Error(`sandbox 页面加载超时（${SANDBOX_LOAD_TIMEOUT}ms）`));
      }, SANDBOX_LOAD_TIMEOUT);
      const handleLoad = () => {
        clearTimeout(timer);
        sandboxReadyPromise = null;
        sandboxWindow = frame.contentWindow;
        if (!sandboxWindow) {
          reject(new Error("无法获取 sandbox 窗口"));
          return;
        }
        resolve(sandboxWindow);
      };
      frame.addEventListener("load", handleLoad, { once: true });
    });
  }
  return sandboxReadyPromise;
};
const sendMessageToSandbox = async (payload, timeoutMs = 5000) => {
  const targetWindow = await getSandboxWindow();
  if (!targetWindow) {
    throw new Error("sandbox 窗口不可用");
  }
  const requestId = createRandomId("sandbox");
  return new Promise((resolve, reject) => {
    let timer = null;
    const handleMessage = (event) => {
      if (event.source !== targetWindow) {
        return;
      }
      const { data } = event;
      if (!data || data.type !== SANDBOX_RESPONSE_TYPE) {
        return;
      }
      if (data.requestId !== requestId) {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      resolve(data);
    };
    timer = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error(`等待 sandbox 响应超时（${timeoutMs}ms）`));
    }, timeoutMs);
    window.addEventListener("message", handleMessage);
    targetWindow.postMessage(
      { ...payload, requestId, type: SANDBOX_REQUEST_TYPE },
      "*",
    );
  });
};
export default sendMessageToSandbox;
