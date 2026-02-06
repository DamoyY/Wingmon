const RENDER_TYPE = "renderHtml",
  PREVIEW_FRAME_ID = "llm-sandbox-preview-frame";

type RenderHtmlMessage = {
  type?: string;
  html?: string;
};

const ensurePreviewFrame = (): HTMLIFrameElement => {
    const existing = document.getElementById(PREVIEW_FRAME_ID);
    if (existing instanceof HTMLIFrameElement) {
      return existing;
    }
    if (existing) {
      existing.remove();
    }
    const frame = document.createElement("iframe");
    frame.id = PREVIEW_FRAME_ID;
    frame.sandbox = "allow-scripts";
    frame.style.cssText =
      "width: 100vw; height: 100vh; border: none; position: fixed; top: 0; left: 0; display: block;";
    document.body.appendChild(frame);
    return frame;
  },
  handleRenderHtml = (message: RenderHtmlMessage): void => {
    const { html } = message;
    if (typeof html !== "string") {
      window.console.error("html 必须是字符串");
      return;
    }
    try {
      const frame = ensurePreviewFrame();
      frame.srcdoc = html;
    } catch (error) {
      window.console.error("渲染 HTML 预览失败", error);
    }
  },
  registerRenderHtmlListener = (): void => {
    window.addEventListener("message", (event: MessageEvent) => {
      const data = (event.data ?? {}) as RenderHtmlMessage;
      if (data.type === RENDER_TYPE) {
        handleRenderHtml(data);
      }
    });
  };

declare global {
  interface Window {
    registerRenderHtmlListener?: () => void;
  }
}

window.registerRenderHtmlListener = registerRenderHtmlListener;
