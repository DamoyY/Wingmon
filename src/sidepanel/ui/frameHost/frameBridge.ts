const SANDBOX_FRAME_ID = "llm-sandbox-frame";
const SANDBOX_LOAD_TIMEOUT = 3000;

let sandboxReadyPromise: Promise<Window> | null = null;
let sandboxWindow: Window | null = null;

const ensureSandboxFrame = (): HTMLIFrameElement => {
  const existing = document.getElementById(SANDBOX_FRAME_ID);
  if (existing instanceof HTMLIFrameElement) {
    return existing;
  }
  const frame = document.createElement("iframe");
  frame.id = SANDBOX_FRAME_ID;
  frame.src = chrome.runtime.getURL("public/sandbox.html");
  frame.style.display = "none";
  document.body.appendChild(frame);
  return frame;
};

const getSandboxWindow = async (): Promise<Window> => {
  if (sandboxWindow) {
    return sandboxWindow;
  }
  if (!sandboxReadyPromise) {
    sandboxReadyPromise = new Promise<Window>((resolve, reject) => {
      const frame = ensureSandboxFrame();
      const timer = setTimeout(() => {
        sandboxReadyPromise = null;
        reject(
          new Error(
            `sandbox 页面加载超时（${String(SANDBOX_LOAD_TIMEOUT)}ms）`,
          ),
        );
      }, SANDBOX_LOAD_TIMEOUT);
      const handleLoad = (): void => {
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
