import { EXCLUDED_INPUT_TYPES, TEXT_INPUT_ROLES } from "../common/index.ts";

import type { ElementVisibilityOptions } from "./visibility.js";

const BUTTON_INPUT_TYPES = new Set(["button", "submit", "reset"]);

export const llmControlVisibilityOptions: ElementVisibilityOptions = {
  minimumHeight: 4,
  minimumWidth: 4,
  requirePointerEvents: true,
};

const normalizeControlType = (value: string): string => value.toLowerCase();

const hasTruthyAriaState = (element: Element, attribute: string): boolean => {
  const value = element.getAttribute(attribute);
  if (!value) {
    return false;
  }
  return value.trim().toLowerCase() === "true";
};

const resolveComposedParent = (element: Element): Element | null => {
  if (element.parentElement) {
    return element.parentElement;
  }
  const rootNode = element.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return rootNode.host;
  }
  return null;
};

const isInsideInertTree = (element: Element): boolean => {
  let current: Element | null = element;
  while (current) {
    if (current instanceof HTMLElement && current.inert) {
      return true;
    }
    current = resolveComposedParent(current);
  }
  return false;
};

const supportsDisabledPseudoClass = (
  element: Element,
): element is HTMLElement =>
  element instanceof HTMLButtonElement ||
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement ||
  element instanceof HTMLOptionElement ||
  element instanceof HTMLOptGroupElement ||
  element instanceof HTMLFieldSetElement;

const isElementDisabledForControlUse = (element: Element): boolean => {
  if (isInsideInertTree(element)) {
    return true;
  }
  if (hasTruthyAriaState(element, "aria-disabled")) {
    return true;
  }
  if (supportsDisabledPseudoClass(element) && element.matches(":disabled")) {
    return true;
  }
  return false;
};

const isElementReadOnlyForControlUse = (element: Element): boolean => {
  if (hasTruthyAriaState(element, "aria-readonly")) {
    return true;
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.readOnly;
  }
  return false;
};

const hasButtonRole = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const role = element.getAttribute("role");
  if (!role) {
    return false;
  }
  return role.trim().toLowerCase() === "button";
};

const isButtonInputElement = (element: Element): boolean => {
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }
  return BUTTON_INPUT_TYPES.has(normalizeControlType(element.type));
};

const isButtonCandidateElement = (element: Element): boolean => {
  if (element instanceof HTMLButtonElement) {
    return true;
  }
  if (isButtonInputElement(element)) {
    return true;
  }
  return hasButtonRole(element);
};

const hasTextInputRole = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const role = element.getAttribute("role");
  if (!role) {
    return false;
  }
  return TEXT_INPUT_ROLES.has(role.trim().toLowerCase());
};

const isEditableCandidateElement = (element: Element): boolean => {
  if (element instanceof HTMLInputElement) {
    return !EXCLUDED_INPUT_TYPES.has(normalizeControlType(element.type));
  }
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }
  return hasTextInputRole(element);
};

const isButtonElement = (element: Element): boolean => {
  if (!isButtonCandidateElement(element)) {
    return false;
  }
  return !isElementDisabledForControlUse(element);
};

const isEditableElement = (element: Element): boolean => {
  if (!isEditableCandidateElement(element)) {
    return false;
  }
  if (isElementDisabledForControlUse(element)) {
    return false;
  }
  if (isElementReadOnlyForControlUse(element)) {
    return false;
  }
  return true;
};

export { isButtonElement, isEditableCandidateElement, isEditableElement };
