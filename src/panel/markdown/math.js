import renderMathInElement from "katex/contrib/auto-render/auto-render.js";

const ensureElement = (element, label) => {
  if (!(element instanceof Element)) {
    throw new Error(`${label}无效`);
  }
  return element;
};

const renderMath = (container) => {
  const target = ensureElement(container, "消息内容容器");
  renderMathInElement(target, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
    output: "html",
    throwOnError: true,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    errorCallback: (message, error) => {
      const detail = error?.message ? `：${error.message}` : "";
      throw new Error(`${message}${detail}`);
    },
  });
};

export default renderMath;
