import {
  type DomPathErrorMessages,
  buildDomPath,
  hashDomPath,
} from "./domPathHash.js";
import {
  clearHiddenElementsForMarkdown,
  markHiddenElementsForMarkdown,
} from "./visibility.js";
import { isButtonElement, isEditableElement } from "./editableElements.js";
import { normalizeText } from "../extractors/labels.js";
import { parseRequiredPositiveInteger } from "../../shared/index.ts";
import { resolveButtonLabel } from "../extractors/buttons.js";
import { resolveInputLabel } from "../extractors/inputs.js";

const HASH_LENGTH = 6;
const llmIdAttribute = "data-llm-id";
const llmLabelAttribute = "data-llm-label";
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
type NamedControl = {
  element: Element;
  label: string;
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

const collectMatchedControls = (
  root: Element,
  matcher: (element: Element) => boolean,
): Element[] => {
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
    if (matcher(element)) {
      controls.push(element);
    }
    pushComposedChildren(stack, element);
  }
  return controls;
};
const collectMatchedInputs = (root: Element): Element[] =>
  collectMatchedControls(root, isEditableElement);
const collectMatchedButtons = (root: Element): Element[] =>
  collectMatchedControls(root, isButtonElement);

const clearAssignedLlmIds = (root: Element): void => {
  const stack: Element[] = [root];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) {
      continue;
    }
    element.removeAttribute(llmIdAttribute);
    element.removeAttribute(llmLabelAttribute);
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
): NamedControl[] => {
  const namedControls: NamedControl[] = [];
  const namedControlSet = new Set<Element>();
  resolvers.forEach((resolver) => {
    resolver.controls.forEach((control) => {
      if (namedControlSet.has(control)) {
        return;
      }
      const label = normalizeText(
        resolveLabelSafely(
          () => resolver.labelResolver(control),
          resolver.kind,
        ),
      );
      if (!label) {
        return;
      }
      namedControlSet.add(control);
      namedControls.push({
        element: control,
        label,
      });
    });
  });
  return namedControls;
};

const assignLlmIds = (root: Element, tabId: number): void => {
  const resolvedTabId = parseRequiredPositiveInteger(tabId, "tabId");
  clearAssignedLlmIds(root);
  markHiddenElementsForMarkdown(root);
  try {
    const buttons = collectMatchedButtons(root),
      inputs = collectMatchedInputs(root),
      namedControls = collectNamedControls([
        {
          controls: buttons,
          kind: "按钮",
          labelResolver: (control) => resolveButtonLabel(control),
        },
        {
          controls: inputs,
          kind: "输入框",
          labelResolver: (control) => resolveInputLabel(control),
        },
      ]),
      usedIds = new Set<string>(),
      totalTargets = namedControls.length,
      assignId = (namedControl: NamedControl): void => {
        const path = buildDomPath(
            namedControl.element,
            root,
            llmIdPathErrorMessages,
          ),
          id = hashDomPath(`${String(resolvedTabId)}:${path}`, HASH_LENGTH);
        if (usedIds.has(id)) {
          throw new Error(
            `控件 ID 冲突：${id}，控件总量：${String(totalTargets)}`,
          );
        }
        usedIds.add(id);
        namedControl.element.setAttribute(llmIdAttribute, id);
        namedControl.element.setAttribute(
          llmLabelAttribute,
          namedControl.label,
        );
      };
    namedControls.forEach((namedControl) => {
      assignId(namedControl);
    });
  } catch (error) {
    clearHiddenElementsForMarkdown(root);
    throw error;
  }
};

export default assignLlmIds;
