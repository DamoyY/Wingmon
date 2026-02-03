import { buildIdMap, getLabelFromIds, normalizeText } from "./labels.js";

const resolveButtonLabel = (
  idMap: Map<string, Element>,
  button: Element,
): string => {
  const directText =
      button instanceof HTMLInputElement ? button.value : button.textContent,
    normalizedText = normalizeText(directText);
  if (normalizedText) {
    return normalizedText;
  }
  const ariaLabel = normalizeText(button.getAttribute("aria-label"));
  if (ariaLabel) {
    return ariaLabel;
  }
  const ariaLabelledby = normalizeText(button.getAttribute("aria-labelledby"));
  if (ariaLabelledby) {
    const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
    if (!ids.length) {
      throw new Error("aria-labelledby 为空，无法解析按钮名称");
    }
    const labeledText = getLabelFromIds(idMap, ids);
    if (labeledText) {
      return labeledText;
    }
  }
  const titleText = normalizeText(button.getAttribute("title"));
  if (titleText) {
    return titleText;
  }
  const imgAlt = normalizeText(
    button.querySelector("img")?.getAttribute("alt"),
  );
  if (imgAlt) {
    return imgAlt;
  }
  const svgTitle = normalizeText(
    button.querySelector("svg title")?.textContent,
  );
  if (svgTitle) {
    return svgTitle;
  }
  const svgLabel = normalizeText(
    button.querySelector("svg")?.getAttribute("aria-label"),
  );
  if (svgLabel) {
    return svgLabel;
  }
  return "";
};

const applyReplacementToButton = (
  button: Element,
  replacement: string,
): void => {
  const target = button as HTMLElement;
  target.textContent = replacement;
  if (target instanceof HTMLInputElement) {
    target.value = replacement;
    target.setAttribute("value", replacement);
  }
};

const removeButtonNode = (button: Element): void => {
  const parent = button.parentNode;
  if (!parent) {
    throw new Error("按钮缺少父节点");
  }
  parent.removeChild(button);
};

const replaceButtons = (root: Element): void => {
  const idMap = buildIdMap(root),
    buttonElements = Array.from(root.getElementsByTagName("button")),
    inputButtons = Array.from(root.getElementsByTagName("input")).filter(
      (input) => input.type === "button" || input.type === "submit",
    ),
    buttons = [...buttonElements, ...inputButtons].filter((button) =>
      button.hasAttribute("data-llm-id"),
    );
  buttons.forEach((buttonNode) => {
    const button = buttonNode,
      id = normalizeText(button.getAttribute("data-llm-id"));
    if (!id) {
      throw new Error("按钮缺少 data-llm-id");
    }
    const text = resolveButtonLabel(idMap, button);
    if (!text) {
      removeButtonNode(button);
      return;
    }
    const replacement = `[button: "${text}", id: "${id}"]`;
    applyReplacementToButton(button, replacement);
  });
};

export default replaceButtons;
export { resolveButtonLabel };
