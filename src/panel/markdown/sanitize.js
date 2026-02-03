import { normalizeUrl } from "../utils/index.ts";

export const isSafeUrl = (url) => {
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
export const isDataUrl = (url) => normalizeUrl(url).startsWith("data:");
export const sanitizeRenderedHtml = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allElements = template.content.querySelectorAll("*");
  allElements.forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attr.name);
      }
    });
  });
  template.content.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!isSafeUrl(href)) {
      link.removeAttribute("href");
    }
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("target", "_blank");
  });
  template.content.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!isSafeUrl(src)) {
      img.removeAttribute("src");
    }
  });
  return template.innerHTML;
};
