import hljs from "highlight.js";

const ensureElement = (element, label) => {
  if (!(element instanceof Element)) {
    throw new Error(`${label}无效`);
  }
  return element;
};

const highlightBlock = (block) => {
  const target = ensureElement(block, "代码块");
  hljs.highlightElement(target);
};

const highlightCodeBlocks = (container) => {
  const target = ensureElement(container, "消息内容容器");
  target.querySelectorAll("pre code").forEach((block) => {
    highlightBlock(block);
  });
};

export default highlightCodeBlocks;
