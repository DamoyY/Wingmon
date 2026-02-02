const SANDBOX_FRAME_ID = "llm-sandbox-frame";
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

export default getSandboxWindow;
