import { init, mdToHtml } from "md4w";
import { sanitizeRenderedHtml } from "./sanitize.js";

const parseFlags = [
  "DEFAULT",
  "NO_HTML",
  "HARD_SOFT_BREAKS",
  "PERMISSIVE_WWW_AUTO_LINKS",
  "PERMISSIVE_EMAIL_AUTO_LINKS",
];
let initPromise = null,
  initialized = false;

const getWasmUrl = () => {
  if (typeof window === "undefined") {
    throw new Error("window 不可用，无法加载 md4w wasm");
  }
  if (!window.location?.href) {
    throw new Error("window.location 不可用，无法定位 md4w wasm");
  }
  return new URL("md4w-fast.wasm", window.location.href);
};

export const initMarkdownRenderer = async () => {
  if (initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      if (typeof fetch !== "function") {
        throw new Error("fetch 不可用，无法加载 md4w wasm");
      }
      const wasmUrl = getWasmUrl(),
        response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`加载 md4w wasm 失败：${response.status}`);
      }
      const wasmBuffer = await response.arrayBuffer();
      await init(wasmBuffer);
      initialized = true;
    })();
  }
  await initPromise;
};

const ensureInitialized = () => {
    if (!initialized) {
      throw new Error("Markdown 渲染器尚未初始化");
    }
  },
  renderMarkdown = (content) => {
    ensureInitialized();
    const html = mdToHtml(content || "", { parseFlags });
    return sanitizeRenderedHtml(html);
  };

export default renderMarkdown;
