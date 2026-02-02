const HASH_LENGTH = 6;
const getDomPath = (element, root) => {
  if (!element || !element.tagName) {
    throw new Error("按钮节点无效");
  }
  if (!root || !root.tagName) {
    throw new Error("根节点无效");
  }
  if (!root.contains(element)) {
    throw new Error("按钮不在根节点之内");
  }
  const segments = [];
  let current = element;
  while (current && current.tagName) {
    const tag = current.tagName.toLowerCase();
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName && sibling.tagName.toLowerCase() === tag) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }
    segments.push(`${tag}:nth-of-type(${index})`);
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  if (!segments.length || segments[segments.length - 1] === undefined) {
    throw new Error("无法生成按钮的 DOM 路径");
  }
  return segments.reverse().join(">");
};
const hashPath = (path) => {
  let hash = 0;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 131 + path.charCodeAt(i)) % 4294967296;
  }
  const encoded = Math.floor(hash).toString(36).padStart(8, "0");
  return encoded.slice(-HASH_LENGTH);
};
const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const usedIds = new Set();
  const totalButtons = buttons.length;
  buttons.forEach((button) => {
    const path = getDomPath(button, root);
    const id = hashPath(path);
    if (usedIds.has(id)) {
      throw new Error(`按钮 ID 冲突：${id}，按钮总量：${totalButtons}`);
    }
    usedIds.add(id);
    button.setAttribute("data-llm-id", id);
  });
};
export default assignLlmIds;
