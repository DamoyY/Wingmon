const RENDER_TYPE = "renderHtml";

type RenderHtmlMessage = {
  type?: string;
  html?: string;
};

const applyDocumentAttributes = (source: HTMLElement): void => {
    const target = document.documentElement;
    Array.from(target.attributes).forEach((attr) => {
      target.removeAttribute(attr.name);
    });
    Array.from(source.attributes).forEach((attr) => {
      target.setAttribute(attr.name, attr.value);
    });
  },
  handleRenderHtml = (message: RenderHtmlMessage): void => {
    const { html } = message;
    if (typeof html !== "string") {
      window.console.error("html 必须是字符串");
      return;
    }
    const parsed = new DOMParser().parseFromString(html, "text/html");
    applyDocumentAttributes(parsed.documentElement);
    document.documentElement.innerHTML = parsed.documentElement.innerHTML;
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
