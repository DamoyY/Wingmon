import {
  type DomPathErrorMessages,
  buildDomPath,
  hashDomPath,
} from "./domPathHash.js";
import {
  clearHiddenElementsForMarkdown,
  isElementVisible,
  markHiddenElementsForMarkdown,
} from "./visibility.js";
import {
  isButtonElement,
  isEditableElement,
  llmControlVisibilityOptions,
} from "./editableElements.js";
import { buildIdMap } from "../extractors/labels.js";
import { resolveButtonLabel } from "../extractors/buttons.js";
import { resolveInputLabel } from "../extractors/inputs.js";

const HASH_LENGTH = 6;
const llmIdPathErrorMessages: DomPathErrorMessages = {
  emptyPath: "无法生成控件的 DOM 路径",
  invalidElement: "控件节点无效",
  invalidRoot: "根节点无效",
  outsideRoot: "控件不在根节点之内",
};
const skippedTraversalTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "LINK",
  "META",
  "SVG",
  "PATH",
]);

type NamedControlResolver = {
  controls: Element[];
  kind: string;
  labelResolver: (element: Element) => string;
};

const collectVisibleControls = (
  root: Element,
  matcher: (element: Element) => boolean,
): Element[] => {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    throw new Error("无法获取窗口对象");
  }
  const controls: Element[] = [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Node) => {
      const element = node as Element;
      if (skippedTraversalTags.has(element.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (
      matcher(element) &&
      isElementVisible(element, win, llmControlVisibilityOptions)
    ) {
      controls.push(element);
    }
    node = walker.nextNode();
  }
  return controls;
};
const collectVisibleInputs = (root: Element): Element[] =>
  collectVisibleControls(root, isEditableElement);
const collectVisibleButtons = (root: Element): Element[] =>
  collectVisibleControls(root, isButtonElement);

const clearAssignedLlmIds = (root: Element): void => {
  const targets = [root, ...Array.from(root.querySelectorAll("[data-llm-id]"))];
  targets.forEach((target) => {
    target.removeAttribute("data-llm-id");
  });
};

const resolveLabelSafely = (resolver: () => string, kind: string): string => {
  try {
    const label = resolver();
    return label;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${kind}命名失败：${message}`);
    return "";
  }
};

const collectNamedControls = (
  resolvers: readonly NamedControlResolver[],
): Element[] => {
  const namedControls: Element[] = [];
  const namedControlSet = new Set<Element>();
  resolvers.forEach((resolver) => {
    resolver.controls.forEach((control) => {
      if (namedControlSet.has(control)) {
        return;
      }
      const label = resolveLabelSafely(
        () => resolver.labelResolver(control),
        resolver.kind,
      );
      if (!label) {
        return;
      }
      namedControlSet.add(control);
      namedControls.push(control);
    });
  });
  return namedControls;
};

const assignLlmIds = (root: Element): void => {
  clearAssignedLlmIds(root);
  markHiddenElementsForMarkdown(root);
  try {
    const buttons = collectVisibleButtons(root),
      inputs = collectVisibleInputs(root),
      idMap = buildIdMap(root),
      namedControls = collectNamedControls([
        {
          controls: buttons,
          kind: "按钮",
          labelResolver: (control) => resolveButtonLabel(idMap, control),
        },
        {
          controls: inputs,
          kind: "输入框",
          labelResolver: (control) => resolveInputLabel(root, idMap, control),
        },
      ]),
      usedIds = new Set<string>(),
      totalTargets = namedControls.length,
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
    namedControls.forEach((control) => {
      assignId(control);
    });
  } catch (error) {
    clearHiddenElementsForMarkdown(root);
    throw error;
  }
};

export default assignLlmIds;
