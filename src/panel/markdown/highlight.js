import hljs from "highlight.js";
import { ensureElement } from "../utils/index.ts";

const highlightBlock = (block) => {
    const target = ensureElement(block, "代码块");
    hljs.highlightElement(target);
  },
  highlightCodeBlocks = (container) => {
    const target = ensureElement(container, "消息内容容器");
    target.querySelectorAll("pre code").forEach((block) => {
      highlightBlock(block);
    });
  };

export default highlightCodeBlocks;
