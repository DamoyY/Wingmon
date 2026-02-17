import { normalizeText, resolveElementAccessibleName } from "./labels.js";
import { buildControlMarker } from "./controlMarkers.ts";
import { isEditableCandidateElement } from "../dom/editableElements.js";

const resolveInputFallbackLabel = (input: Element): string => {
  return (
    normalizeText(input.getAttribute("placeholder")) ||
    normalizeText(input.getAttribute("title"))
  );
};

const resolveInputLabel = (input: Element): string => {
  return (
    resolveElementAccessibleName(input) || resolveInputFallbackLabel(input)
  );
};

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
  const candidates = Array.from(root.getElementsByTagName("*"));
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
    const text = normalizeText(inputNode.getAttribute("data-llm-label"));
    if (!text) {
      console.error(`输入框缺少 data-llm-label：${id}`);
      removeInputNode(inputNode);
      return;
    }
    const replacement = buildControlMarker("Input", text, id);
    replaceInputNode(inputNode, replacement);
  });
};

export default replaceInputs;
export { resolveInputLabel };
