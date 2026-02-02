import {
  highlightCodeBlocks,
  renderMarkdown,
  renderMath,
} from "../../markdown/index.js";

const resolveDecorator = (decorator) => {
    if (decorator === undefined || decorator === null) {
      return null;
    }
    if (typeof decorator !== "function") {
      throw new Error("消息内容装饰器格式无效");
    }
    return decorator;
  },
  renderMessageContent = (content, options = {}) => {
    if (typeof content !== "string") {
      throw new Error("消息内容格式无效");
    }
    const container = document.createElement("div");
    container.innerHTML = renderMarkdown(content);
    const decorateContainer = resolveDecorator(options?.decorateContainer);
    if (decorateContainer) {
      decorateContainer(container);
    }
    renderMath(container);
    highlightCodeBlocks(container);
    return {
      html: container.innerHTML,
      text: container.textContent || "",
    };
  };

export default renderMessageContent;
