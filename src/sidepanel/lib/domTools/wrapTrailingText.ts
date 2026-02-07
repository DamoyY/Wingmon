const ensureClassName = (className: string): string => {
  if (typeof className !== "string" || !className.trim()) {
    throw new Error("文本包裹样式类名无效");
  }
  return className;
};

export const wrapTrailingText = (
  container: HTMLElement,
  length: number,
  className: string,
): void => {
  if (!Number.isInteger(length) || length <= 0) {
    return;
  }
  const resolvedClassName = ensureClassName(className);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) {
      nodes.push(current);
    }
    current = walker.nextNode();
  }
  let remaining = length;
  for (let i = nodes.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const node = nodes[i];
    const value = node.nodeValue ?? "";
    if (!value) {
      continue;
    }
    const take = Math.min(remaining, value.length);
    const splitIndex = value.length - take;
    const beforeText = value.slice(0, splitIndex);
    const targetText = value.slice(splitIndex);
    const parent = node.parentNode;
    if (!parent) {
      throw new Error("文本节点父节点不存在");
    }
    if (beforeText) {
      parent.insertBefore(document.createTextNode(beforeText), node);
    }
    const span = document.createElement("span");
    span.className = resolvedClassName;
    span.textContent = targetText;
    parent.insertBefore(span, node);
    parent.removeChild(node);
    remaining -= take;
  }
};
