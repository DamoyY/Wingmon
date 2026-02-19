import { getRole, isDisabled, isInaccessible } from "dom-accessibility-api";

import { EXCLUDED_INPUT_TYPES } from "../common/index.ts";

const BUTTON_ROLE = "button";
const ARIA_READONLY_TRUE = "true";
const EDITABLE_CONTROL_ROLES = new Set([
  "textbox",
  "searchbox",
  "combobox",
  "spinbutton",
  "listbox",
]);

const normalizeInputType = (value: string): string => value.toLowerCase();

const getElementRole = (element: Element): string => getRole(element) ?? "";

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

const isPseudoDisabledControl = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  return element.matches(":disabled");
};

const isControlDisabled = (element: Element): boolean => {
  if (isInsideInertTree(element)) {
    return true;
  }
  if (isPseudoDisabledControl(element)) {
    return true;
  }
  return isDisabled(element);
};

const isControlInaccessible = (element: Element): boolean =>
  isInaccessible(element);

const isControlUnavailable = (element: Element): boolean => {
  if (isControlDisabled(element)) {
    return true;
  }
  return isControlInaccessible(element);
};

const hasEditableRole = (element: Element): boolean => {
  const role = getElementRole(element);
  return EDITABLE_CONTROL_ROLES.has(role);
};

const isEditableInputElement = (element: Element): boolean => {
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }
  return !EXCLUDED_INPUT_TYPES.has(normalizeInputType(element.type));
};

const isReadOnlyTextEntryElement = (element: Element): boolean => {
  const ariaReadOnly = element.getAttribute("aria-readonly");
  if (
    ariaReadOnly &&
    ariaReadOnly.trim().toLowerCase() === ARIA_READONLY_TRUE
  ) {
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

const isEditableCandidateElement = (element: Element): boolean => {
  if (hasEditableRole(element)) {
    return true;
  }
  if (isEditableInputElement(element)) {
    return true;
  }
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }
  return false;
};

const isNativeButtonElement = (element: Element): boolean =>
  element instanceof HTMLButtonElement;

const isButtonElement = (element: Element): boolean => {
  const isButtonByRole = getElementRole(element) === BUTTON_ROLE;
  if (!isButtonByRole && !isNativeButtonElement(element)) {
    return false;
  }
  return !isControlUnavailable(element);
};

const isEditableElement = (element: Element): boolean => {
  if (!isEditableCandidateElement(element)) {
    return false;
  }
  if (isControlUnavailable(element)) {
    return false;
  }
  if (isReadOnlyTextEntryElement(element)) {
    return false;
  }
  return true;
};

export { isButtonElement, isEditableCandidateElement, isEditableElement };
