import DOMPurify from "dompurify";
import { normalizeUrl } from "../utils/index.ts";

export const isSafeUrl = (url: string | null | undefined): boolean => {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("#")) {
    return true;
  }
  const schemeMatch = normalized.match(/^[a-z0-9+.-]+:/);
  if (!schemeMatch) {
    return true;
  }
  return (
    normalized.startsWith("http:") ||
    normalized.startsWith("https:") ||
    normalized.startsWith("mailto:")
  );
};

export const isDataUrl = (url: string | null | undefined): boolean =>
  normalizeUrl(url).startsWith("data:");

const anchorTagName = "A";
const imageTagName = "IMG";
const linkRel = "noopener noreferrer";
const linkTarget = "_blank";
let hooksReady = false;

const ensureHooks = (): void => {
  if (hooksReady) {
    return;
  }
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) {
      return;
    }
    if (node.tagName === anchorTagName) {
      const href = node.getAttribute("href");
      if (href && !isSafeUrl(href)) {
        node.removeAttribute("href");
      }
      node.setAttribute("rel", linkRel);
      node.setAttribute("target", linkTarget);
    }
    if (node.tagName === imageTagName) {
      const src = node.getAttribute("src");
      if (src && !isSafeUrl(src)) {
        node.removeAttribute("src");
      }
    }
  });
  hooksReady = true;
};

export const sanitizeRenderedHtml = (
  html: string | null | undefined,
): string => {
  ensureHooks();
  const content = html ?? "";
  if (!content) {
    return "";
  }
  return DOMPurify.sanitize(content);
};
