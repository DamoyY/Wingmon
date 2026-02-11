import { buildIdMap, normalizeText, resolveElementLabel } from "./labels.js";
import { buildControlMarker } from "./controlMarkers.ts";
import { isButtonElement } from "../dom/editableElements.js";

const resolveButtonLabel = (
  idMap: Map<string, Element>,
  button: Element,
): string =>
  resolveElementLabel(
    idMap,
    button,
    [
      () => {
        const directText =
          button instanceof HTMLInputElement
            ? button.value
            : button.textContent;
        return normalizeText(directText);
      },
    ],
    [
      () => normalizeText(button.getAttribute("title")),
      () => normalizeText(button.querySelector("img")?.getAttribute("alt")),
      () => normalizeText(button.querySelector("svg title")?.textContent),
      () =>
        normalizeText(button.querySelector("svg")?.getAttribute("aria-label")),
    ],
    "aria-labelledby 为空，无法解析按钮名称",
  );

const applyReplacementToButton = (
  button: Element,
  replacement: string,
): void => {
  const parent = button.parentNode;
  if (!parent) {
    throw new Error("按钮缺少父节点");
  }
  const doc = button.ownerDocument;
  const textNode = doc.createTextNode(replacement);
  parent.replaceChild(textNode, button);
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
    buttons = Array.from(root.querySelectorAll("[data-llm-id]")).filter(
      (button) => isButtonElement(button),
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
    const replacement = buildControlMarker("Button", text, id);
    applyReplacementToButton(button, replacement);
  });
};

export default replaceButtons;
export { resolveButtonLabel };
