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
const maximumAnchorCount = 25;
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

const shuffleElements = (elements: HTMLElement[]): void => {
  for (let index = elements.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = elements[index];
    const target = elements[swapIndex];
    elements[index] = target;
    elements[swapIndex] = current;
  }
};

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

export const buildChunkAnchorMarker = (anchorId: string): string =>
  `${chunkAnchorPrefix}${anchorId}${chunkAnchorSuffix}`;

export const assignChunkAnchors = (root: HTMLElement): void => {
  const win = root.ownerDocument.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  clearChunkAnchors(root);
  const usedIds = new Set<string>();
  const candidates: HTMLElement[] = [];
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
  );
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (isAnchorCandidate(element, win)) {
      candidates.push(element);
    }
    node = walker.nextNode();
  }
  shuffleElements(candidates);
  const assignLimit = Math.min(maximumAnchorCount, candidates.length);
  for (let index = 0; index < assignLimit; index += 1) {
    const candidate = candidates[index];
    const anchorId = resolveAnchorId(candidate, root, usedIds);
    candidate.setAttribute(chunkAnchorAttribute, anchorId);
  }
};
