import {
  type DomPathErrorMessages,
  buildDomPath,
  hashDomPath,
} from "./domPathHash.js";
import {
  type ElementVisibilityOptions,
  isElementVisible,
} from "./visibility.js";
import { buildIdMap } from "../extractors/labels.js";
import { isEditableElement } from "./editableElements.js";
import { resolveButtonLabel } from "../extractors/buttons.js";
import { resolveInputLabel } from "../extractors/inputs.js";

const HASH_LENGTH = 6;
const llmIdPathErrorMessages: DomPathErrorMessages = {
  emptyPath: "无法生成控件的 DOM 路径",
  invalidElement: "控件节点无效",
  invalidRoot: "根节点无效",
  outsideRoot: "控件不在根节点之内",
};
const llmInputVisibilityOptions: ElementVisibilityOptions = {
  minimumHeight: 4,
  minimumWidth: 4,
  requirePointerEvents: true,
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
      if (isElementVisible(element, win, llmInputVisibilityOptions)) {
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
      const path = buildDomPath(element, root, llmIdPathErrorMessages),
        id = hashDomPath(path, HASH_LENGTH);
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
