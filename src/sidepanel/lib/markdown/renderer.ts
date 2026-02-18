import { init, mdToHtml } from "md4w";
import md4wWasmBytes from "../../../../node_modules/md4w/js/md4w-fast.wasm";
import { sanitizeRenderedHtml } from "./sanitize.ts";

const parseFlags: string[] = [
  "DEFAULT",
  "NO_HTML",
  "HARD_SOFT_BREAKS",
  "PERMISSIVE_WWW_AUTO_LINKS",
  "PERMISSIVE_EMAIL_AUTO_LINKS",
];
let initPromise: Promise<void> | null = null;
let initialized = false;

export const initMarkdownRenderer = async (): Promise<void> => {
  if (initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      await init(md4wWasmBytes);
      initialized = true;
    })();
  }
  await initPromise;
};

const ensureInitialized = (): void => {
  if (!initialized) {
    throw new Error("Markdown 渲染器尚未初始化");
  }
};

const renderMarkdown = (content: string | null | undefined): string => {
  ensureInitialized();
  const text = content ?? "";
  if (!text) {
    return "";
  }
  const html = mdToHtml(text, { parseFlags });
  return sanitizeRenderedHtml(html);
};

export default renderMarkdown;
