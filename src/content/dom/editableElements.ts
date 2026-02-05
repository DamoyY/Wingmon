import { EXCLUDED_INPUT_TYPES, TEXT_INPUT_ROLES } from "../shared/index.ts";

const isEditableElement = (element: Element): boolean => {
  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
    return !EXCLUDED_INPUT_TYPES.has(element.type);
  }
  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
    return true;
  }
  if (element instanceof HTMLSelectElement) {
    if (element.disabled) {
      return false;
    }
    return true;
  }
  const htmlElement = element as HTMLElement;
  if (htmlElement.inert) {
    return false;
  }
  if (htmlElement.isContentEditable) {
    return true;
  }
  const role = htmlElement.getAttribute("role");
  if (role && TEXT_INPUT_ROLES.has(role)) {
    return true;
  }
  return false;
};

export { isEditableElement };
