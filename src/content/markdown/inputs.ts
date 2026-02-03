import { buildIdMap, getLabelFromIds, normalizeText } from "./labels.js";

const EXCLUDED_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
]);
const TEXT_INPUT_ROLES = new Set(["textbox", "searchbox", "combobox"]);

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
): string => {
  const labelText = getLabelFromAssociatedLabel(root, input);
  if (labelText) {
    return labelText;
  }
  const ariaLabel = normalizeText(input.getAttribute("aria-label"));
  if (ariaLabel) {
    return ariaLabel;
  }
  const ariaLabelledby = normalizeText(input.getAttribute("aria-labelledby"));
  if (ariaLabelledby) {
    const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
    if (!ids.length) {
      throw new Error("aria-labelledby 为空，无法解析输入框名称");
    }
    const labeledText = getLabelFromIds(idMap, ids);
    if (labeledText) {
      return labeledText;
    }
  }
  const placeholderText = normalizeText(input.getAttribute("placeholder"));
  if (placeholderText) {
    return placeholderText;
  }
  const titleText = normalizeText(input.getAttribute("title"));
  if (titleText) {
    return titleText;
  }
  return "";
};

const isInputCandidate = (element: Element): boolean => {
  if (element instanceof HTMLInputElement) {
    return !EXCLUDED_INPUT_TYPES.has(element.type);
  }
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (element instanceof HTMLSelectElement) {
    return true;
  }
  const htmlElement = element as HTMLElement;
  const contentEditable = htmlElement.getAttribute("contenteditable");
  if (contentEditable !== null && contentEditable !== "false") {
    return true;
  }
  const role = htmlElement.getAttribute("role");
  if (role && TEXT_INPUT_ROLES.has(role)) {
    return true;
  }
  return false;
};

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
    const replacement = `[input: "${text}", id: "${id}"]`;
    replaceInputNode(inputNode, replacement);
  });
};

export default replaceInputs;
export { resolveInputLabel };
