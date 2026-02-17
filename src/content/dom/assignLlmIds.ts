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
import { parseRequiredPositiveInteger } from "../../shared/index.ts";
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

const pushChildrenInReverse = (
  stack: Element[],
  children: HTMLCollection,
): void => {
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children.item(index);
    if (child) {
      stack.push(child);
    }
  }
};

const pushComposedChildren = (stack: Element[], element: Element): void => {
  pushChildrenInReverse(stack, element.children);
  if (element instanceof HTMLElement && element.shadowRoot) {
    pushChildrenInReverse(stack, element.shadowRoot.children);
  }
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
  const stack: Element[] = [];
  pushComposedChildren(stack, root);
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) {
      continue;
    }
    if (skippedTraversalTags.has(element.tagName)) {
      continue;
    }
    if (
      matcher(element) &&
      isElementVisible(element, win, llmControlVisibilityOptions)
    ) {
      controls.push(element);
    }
    pushComposedChildren(stack, element);
  }
  return controls;
};
const collectVisibleInputs = (root: Element): Element[] =>
  collectVisibleControls(root, isEditableElement);
const collectVisibleButtons = (root: Element): Element[] =>
  collectVisibleControls(root, isButtonElement);

const clearAssignedLlmIds = (root: Element): void => {
  const stack: Element[] = [root];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) {
      continue;
    }
    element.removeAttribute("data-llm-id");
    pushComposedChildren(stack, element);
  }
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

const assignLlmIds = (root: Element, tabId: number): void => {
  const resolvedTabId = parseRequiredPositiveInteger(tabId, "tabId");
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
          id = hashDomPath(`${String(resolvedTabId)}:${path}`, HASH_LENGTH);
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
