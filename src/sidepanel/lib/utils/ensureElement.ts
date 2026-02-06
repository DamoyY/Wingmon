export function ensureElement<T extends Element>(
  element: T | null,
  label: string,
  message = `${label}无效`,
): T {
  if (!(element instanceof Element)) {
    throw new Error(message);
  }
  return element;
}

export const requireElementById = (
  id: string,
  label: string,
  message = `${label}元素未找到`,
): HTMLElement =>
  ensureElement<HTMLElement>(document.getElementById(id), label, message);
