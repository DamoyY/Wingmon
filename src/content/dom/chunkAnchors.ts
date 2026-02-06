import {
  buildDomPath,
  hashDomPath,
  type DomPathErrorMessages,
} from "./domPathHash.js";
import {
  isElementVisible,
  type ElementVisibilityOptions,
} from "./visibility.js";

const HASH_LENGTH = 8;
const chunkAnchorPrefix = "LLMCHUNKANCHORSTART_";
const chunkAnchorSuffix = "_LLMCHUNKANCHOREND";
const minimumAnchorGapPx = 120;
const maximumAnchorCount = 240;
const minimumTextLength = 24;
const anchorVisibilityOptions: ElementVisibilityOptions = {
  minimumWidth: 8,
  minimumHeight: 8,
  requirePointerEvents: false,
};
const excludedTagNames = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "LINK",
  "META",
  "SVG",
  "PATH",
  "HEAD",
  "TITLE",
]);

export const chunkAnchorAttribute = "data-llm-chunk-anchor-id";
export const chunkAnchorMarkerPattern =
  /LLMCHUNKANCHORSTART\\?_([a-z0-9]+)\\?_LLMCHUNKANCHOREND/g;
const chunkAnchorPathErrorMessages: DomPathErrorMessages = {
  invalidElement: "锚点节点无效",
  invalidRoot: "根节点无效",
  outsideRoot: "锚点元素不在根节点内",
  emptyPath: "无法生成锚点 DOM 路径",
};

const clearChunkAnchors = (root: HTMLElement): void => {
  root.querySelectorAll(`[${chunkAnchorAttribute}]`).forEach((element) => {
    element.removeAttribute(chunkAnchorAttribute);
  });
};

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const resolveAnchorId = (
  element: Element,
  root: Element,
  usedIds: Set<string>,
): string => {
  const base = hashDomPath(
    buildDomPath(element, root, chunkAnchorPathErrorMessages),
    HASH_LENGTH,
  );
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  for (let suffix = 2; suffix <= Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${base}${suffix.toString(36)}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }
  throw new Error("锚点 ID 生成失败");
};

const isAnchorCandidate = (
  element: Element,
  win: Window,
): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (
    element === win.document.body ||
    element === win.document.documentElement
  ) {
    return false;
  }
  if (excludedTagNames.has(element.tagName)) {
    return false;
  }
  const display = win.getComputedStyle(element).display;
  if (
    display === "inline" ||
    display === "inline-block" ||
    display === "contents"
  ) {
    return false;
  }
  if (!isElementVisible(element, win, anchorVisibilityOptions)) {
    return false;
  }
  const text = normalizeText(element.innerText || element.textContent || "");
  if (text.length < minimumTextLength) {
    return false;
  }
  return true;
};

const resolveElementTop = (element: HTMLElement): number => {
  const win = element.ownerDocument.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  return win.scrollY + element.getBoundingClientRect().top;
};

export const buildChunkAnchorMarker = (anchorId: string): string =>
  `${chunkAnchorPrefix}${anchorId}${chunkAnchorSuffix}`;

export const assignChunkAnchors = (root: HTMLElement): void => {
  const win = root.ownerDocument.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  clearChunkAnchors(root);
  const minGap = Math.max(minimumAnchorGapPx, Math.floor(win.innerHeight / 5));
  const usedIds = new Set<string>();
  const candidates: Array<{ element: HTMLElement; top: number }> = [];
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
  );
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (isAnchorCandidate(element, win)) {
      candidates.push({
        element,
        top: resolveElementTop(element),
      });
    }
    node = walker.nextNode();
  }
  candidates.sort((left, right) => left.top - right.top);
  let assigned = 0;
  let lastTop = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    if (assigned === 0 || candidate.top - lastTop >= minGap) {
      const anchorId = resolveAnchorId(candidate.element, root, usedIds);
      candidate.element.setAttribute(chunkAnchorAttribute, anchorId);
      lastTop = candidate.top;
      assigned += 1;
      if (assigned >= maximumAnchorCount) {
        return;
      }
    }
  }
};
