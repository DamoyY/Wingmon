import { resolveButtonLabel } from "../markdown/buttons.js";
import { isEditableElement } from "./editableElements.js";
import { resolveInputLabel } from "../markdown/inputs.js";
import { buildIdMap } from "../markdown/labels.js";

const HASH_LENGTH = 6;

const getDomPath = (element: Element | null, root: Element | null): string => {
  if (!element) {
    throw new Error("控件节点无效");
  }
  if (!root) {
    throw new Error("根节点无效");
  }
  if (!root.contains(element)) {
    throw new Error("控件不在根节点之内");
  }
  const segments: string[] = [];
  let current: Element | null = element;
  while (current) {
    const tag = current.tagName.toLowerCase();
    let index = 1,
      sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName && sibling.tagName.toLowerCase() === tag) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }
    segments.push(`${tag}:nth-of-type(${String(index)})`);
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  if (!segments.length) {
    throw new Error("无法生成控件的 DOM 路径");
  }
  return segments.reverse().join(">");
};

const hashPath = (path: string): string => {
  let hash = 0;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 131 + path.charCodeAt(i)) % 4294967296;
  }
  const encoded = Math.floor(hash).toString(36).padStart(8, "0");
  return encoded.slice(-HASH_LENGTH);
};

const isVisibleAndInteractive = (element: Element, win: Window): boolean => {
  const visibilityChecker = (
    element as Element & {
      checkVisibility?: (options?: {
        checkOpacity?: boolean;
        checkVisibilityCSS?: boolean;
      }) => boolean;
    }
  ).checkVisibility;
  if (typeof visibilityChecker === "function") {
    if (
      !visibilityChecker.call(element, {
        checkOpacity: true,
        checkVisibilityCSS: true,
      })
    ) {
      return false;
    }
  } else {
    const htmlElement = element as HTMLElement;
    if (
      htmlElement.offsetParent === null &&
      win.getComputedStyle(htmlElement).position !== "fixed"
    ) {
      return false;
    }
  }
  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) {
    return false;
  }
  const style = win.getComputedStyle(element);
  if (style.pointerEvents === "none") {
    return false;
  }
  return true;
};

const collectVisibleInputs = (root: Element): Element[] => {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  const inputs: Element[] = [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Node) => {
      const element = node as Element;
      const tag = element.tagName;
      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "NOSCRIPT" ||
        tag === "LINK" ||
        tag === "META" ||
        tag === "SVG" ||
        tag === "PATH"
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (isEditableElement(element)) {
      if (isVisibleAndInteractive(element, win)) {
        inputs.push(element);
      }
    }
    node = walker.nextNode();
  }
  return inputs;
};

const assignLlmIds = (root: Element): void => {
  const buttons = root.querySelectorAll(
      'button, input[type="button"], input[type="submit"]',
    ),
    inputs = collectVisibleInputs(root),
    idMap = buildIdMap(root),
    usedIds = new Set<string>(),
    resolveLabelSafely = (resolver: () => string, kind: string): string => {
      try {
        const label = resolver();
        return label;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${kind}命名失败：${message}`);
        return "";
      }
    },
    namedButtons = Array.from(buttons).filter((button) =>
      resolveLabelSafely(() => resolveButtonLabel(idMap, button), "按钮"),
    ),
    namedInputs = inputs.filter((input) =>
      resolveLabelSafely(() => resolveInputLabel(root, idMap, input), "输入框"),
    ),
    totalTargets = namedButtons.length + namedInputs.length,
    assignId = (element: Element): void => {
      const path = getDomPath(element, root),
        id = hashPath(path);
      if (usedIds.has(id)) {
        throw new Error(
          `控件 ID 冲突：${id}，控件总量：${String(totalTargets)}`,
        );
      }
      usedIds.add(id);
      element.setAttribute("data-llm-id", id);
    };
  namedButtons.forEach((button) => {
    assignId(button);
  });
  namedInputs.forEach((input) => {
    assignId(input);
  });
};

export default assignLlmIds;
