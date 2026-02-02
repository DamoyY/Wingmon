import { createRandomId } from "../utils/index.js";

const SANDBOX_RESPONSE_TYPE = "runConsoleResult";
const SANDBOX_REQUEST_TYPE = "runConsoleCommand";

let sandboxWindowProvider = null;

const registerSandboxWindowProvider = (provider) => {
  if (typeof provider !== "function") {
    throw new Error("sandbox 窗口提供器无效");
  }
  sandboxWindowProvider = provider;
};

const getSandboxWindow = async () => {
  if (!sandboxWindowProvider) {
    throw new Error("sandbox 尚未初始化");
  }
  const targetWindow = await sandboxWindowProvider();
  if (!targetWindow) {
    throw new Error("sandbox 窗口不可用");
  }
  return targetWindow;
};
const sendMessageToSandbox = async (payload, timeoutMs = 5000) => {
  const targetWindow = await getSandboxWindow();
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
export { registerSandboxWindowProvider };
export default sendMessageToSandbox;
