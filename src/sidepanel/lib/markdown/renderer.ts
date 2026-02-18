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
const backslashCharacter = "\\";
let initPromise: Promise<void> | null = null;
let initialized = false;

const toHtmlDecimalEntity = (value: string): string => {
  const codePoint = value.codePointAt(0);
  if (codePoint === undefined) {
    throw new Error("字符编码无效");
  }
  return `&#${String(codePoint)};`;
};

const readUnicodeCharacter = (
  content: string,
  index: number,
): { nextIndex: number; value: string } => {
  const codePoint = content.codePointAt(index);
  if (codePoint === undefined) {
    throw new Error("文本读取失败");
  }
  const value = String.fromCodePoint(codePoint);
  return {
    nextIndex: index + value.length,
    value,
  };
};

const preserveMarkdownBackslashes = (content: string): string => {
  if (!content.includes(backslashCharacter)) {
    return content;
  }
  const backslashEntity = toHtmlDecimalEntity(backslashCharacter);
  let normalized = "";
  for (let index = 0; index < content.length; ) {
    const current = readUnicodeCharacter(content, index);
    if (current.value !== backslashCharacter) {
      normalized += current.value;
      index = current.nextIndex;
      continue;
    }
    normalized += backslashEntity;
    if (current.nextIndex >= content.length) {
      index = current.nextIndex;
      continue;
    }
    const next = readUnicodeCharacter(content, current.nextIndex);
    normalized += toHtmlDecimalEntity(next.value);
    index = next.nextIndex;
  }
  return normalized;
};

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
  const html = mdToHtml(preserveMarkdownBackslashes(text), { parseFlags });
  return sanitizeRenderedHtml(html);
};

export default renderMarkdown;
