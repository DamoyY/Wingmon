import { ensureElement } from "../utils/index.ts";
import renderMathInElement from "katex/contrib/auto-render/auto-render.js";

const renderMath = (container) => {
  const target = ensureElement(container, "消息内容容器");
  renderMathInElement(target, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
    errorCallback: (message, error) => {
      const detail = error?.message ? `：${error.message}` : "";
      throw new Error(`${message}${detail}`);
    },
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    output: "html",
    throwOnError: true,
  });
};

export default renderMath;
