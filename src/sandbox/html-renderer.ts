const RENDER_TYPE = "renderHtml",
  PREVIEW_FRAME_ID = "llm-sandbox-preview-frame";

type RenderHtmlMessage = {
  type: typeof RENDER_TYPE;
  html: string;
};

const renderHtmlMessageKeys = new Set(["html", "type"]);

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
  hasOnlyKeys = (
    value: Record<string, unknown>,
    allowedKeys: ReadonlySet<string>,
  ): boolean => Object.keys(value).every((key) => allowedKeys.has(key)),
  isRenderHtmlMessage = (value: unknown): value is RenderHtmlMessage => {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      !hasOnlyKeys(value, renderHtmlMessageKeys)
    ) {
      return false;
    }
    return value.type === RENDER_TYPE && typeof value.html === "string";
  },
  handleRenderHtml = (html: string): void => {
    try {
      const frame = ensurePreviewFrame();
      frame.srcdoc = html;
    } catch (error) {
      window.console.error("渲染 HTML 预览失败", error);
    }
  },
  registerRenderHtmlListener = (): void => {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (isRenderHtmlMessage(event.data)) {
        handleRenderHtml(event.data.html);
      }
    });
  };

declare global {
  interface Window {
    registerRenderHtmlListener?: () => void;
  }
}

window.registerRenderHtmlListener = registerRenderHtmlListener;
