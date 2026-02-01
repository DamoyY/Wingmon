import {
  renderMarkdown,
  highlightCodeBlocks,
  renderMath,
} from "../markdown/index.js";

const headingClassMap = new Map([
  ["H1", "md-typescale-headline-medium"],
  ["H2", "md-typescale-headline-small"],
  ["H3", "md-typescale-title-large"],
  ["H4", "md-typescale-title-medium"],
  ["H5", "md-typescale-title-small"],
  ["H6", "md-typescale-body-medium"],
]);

const ensureElement = (element, label) => {
  if (!(element instanceof Element)) {
    throw new Error(`${label}无效`);
  }
  return element;
};

const applyHeadingClasses = (container) => {
  const target = ensureElement(container, "消息内容容器");
  target.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const className = headingClassMap.get(heading.tagName);
    if (!className) {
      throw new Error(`未找到标题样式映射：${heading.tagName}`);
    }
    heading.classList.add(className);
  });
};

const renderMessageContent = (content) => {
  if (typeof content !== "string") {
    throw new Error("消息内容格式无效");
  }
  const container = document.createElement("div");
  container.innerHTML = renderMarkdown(content);
  applyHeadingClasses(container);
  renderMath(container);
  highlightCodeBlocks(container);
  return {
    html: container.innerHTML,
    text: container.textContent || "",
  };
};

export default renderMessageContent;
