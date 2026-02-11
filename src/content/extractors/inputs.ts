import { buildIdMap, normalizeText, resolveElementLabel } from "./labels.js";
import { buildControlMarker } from "./controlMarkers.ts";
import { isEditableCandidateElement } from "../dom/editableElements.js";

const getLabelFromAssociatedLabel = (
  root: Element,
  element: Element,
): string => {
  const htmlElement = element as HTMLElement;
  const wrappingLabel = htmlElement.closest("label");
  if (wrappingLabel) {
    const text = normalizeText(wrappingLabel.textContent);
    if (text) {
      return text;
    }
  }
  const id = htmlElement.getAttribute("id");
  if (id) {
    const labels = Array.from(root.getElementsByTagName("label"));
    const label = labels.find(
      (candidate) =>
        candidate.getAttribute("for") === id || candidate.htmlFor === id,
    );
    const text = normalizeText(label?.textContent);
    if (text) {
      return text;
    }
  }
  return "";
};

const resolveInputLabel = (
  root: Element,
  idMap: Map<string, Element>,
  input: Element,
): string =>
  resolveElementLabel(
    idMap,
    input,
    [() => getLabelFromAssociatedLabel(root, input)],
    [
      () => normalizeText(input.getAttribute("placeholder")),
      () => normalizeText(input.getAttribute("title")),
    ],
    "aria-labelledby 为空，无法解析输入框名称",
  );

const isInputCandidate = (element: Element): boolean =>
  isEditableCandidateElement(element);

const replaceInputNode = (input: Element, replacement: string): void => {
  const parent = input.parentNode;
  if (!parent) {
    throw new Error("输入框缺少父节点");
  }
  const doc = input.ownerDocument;
  const textNode = doc.createTextNode(replacement);
  parent.replaceChild(textNode, input);
};

const removeInputNode = (input: Element): void => {
  const parent = input.parentNode;
  if (!parent) {
    throw new Error("输入框缺少父节点");
  }
  parent.removeChild(input);
};

const replaceInputs = (root: Element): void => {
  const idMap = buildIdMap(root),
    candidates = Array.from(root.getElementsByTagName("*"));
  candidates.forEach((inputNode) => {
    if (!inputNode.hasAttribute("data-llm-id")) {
      return;
    }
    if (!isInputCandidate(inputNode)) {
      return;
    }
    const id = normalizeText(inputNode.getAttribute("data-llm-id"));
    if (!id) {
      throw new Error("输入框缺少 data-llm-id");
    }
    const text = resolveInputLabel(root, idMap, inputNode);
    if (!text) {
      removeInputNode(inputNode);
      return;
    }
    const replacement = buildControlMarker("Input", text, id);
    replaceInputNode(inputNode, replacement);
  });
};

export default replaceInputs;
export { resolveInputLabel };
