import { normalizeText, resolveElementAccessibleName } from "./labels.js";
import { buildControlMarker } from "./controlMarkers.ts";
import { isButtonElement } from "../dom/editableElements.js";

const resolveButtonLabel = (button: Element): string =>
  resolveElementAccessibleName(button);

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
  const buttons = Array.from(root.querySelectorAll("[data-llm-id]")).filter(
    (button) => isButtonElement(button),
  );
  buttons.forEach((buttonNode) => {
    const button = buttonNode,
      id = normalizeText(button.getAttribute("data-llm-id"));
    if (!id) {
      throw new Error("按钮缺少 data-llm-id");
    }
    const text = normalizeText(button.getAttribute("data-llm-label"));
    if (!text) {
      console.error(`按钮缺少 data-llm-label：${id}`);
      removeButtonNode(button);
      return;
    }
    const replacement = buildControlMarker("Button", text, id);
    applyReplacementToButton(button, replacement);
  });
};

export default replaceButtons;
export { resolveButtonLabel };
