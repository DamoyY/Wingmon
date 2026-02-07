import {
  highlightCodeBlocks,
  renderMarkdown,
  renderMath,
} from "../../../../lib/markdown/index.ts";

export type MessageContentDecorator = (container: HTMLElement) => void;

export type RenderMessageContentOptions = {
  decorateContainer?: MessageContentDecorator | null;
};

export type RenderedMessageContent = {
  html: string;
  text: string;
};

type ContainerRenderer = (container: HTMLElement) => void;

const resolveDecorator = (
    decorator: MessageContentDecorator | null | undefined,
  ): MessageContentDecorator | null => {
    if (decorator === undefined || decorator === null) {
      return null;
    }
    if (typeof decorator !== "function") {
      throw new Error("消息内容装饰器格式无效");
    }
    return decorator;
  },
  ensureContainerRenderer = (
    renderer: unknown,
    label: string,
  ): ContainerRenderer => {
    if (typeof renderer !== "function") {
      throw new Error(`${label}格式无效`);
    }
    return renderer;
  },
  renderMathSafe = ensureContainerRenderer(renderMath, "数学渲染器"),
  highlightCodeBlocksSafe = ensureContainerRenderer(
    highlightCodeBlocks,
    "代码高亮渲染器",
  ),
  renderMessageContent = (
    content: string,
    options: RenderMessageContentOptions = {},
  ): RenderedMessageContent => {
    if (typeof content !== "string") {
      throw new Error("消息内容格式无效");
    }
    const container = document.createElement("div");
    container.innerHTML = renderMarkdown(content);
    const decorateContainer = resolveDecorator(options.decorateContainer);
    if (decorateContainer) {
      decorateContainer(container);
    }
    renderMathSafe(container);
    highlightCodeBlocksSafe(container);
    return {
      html: container.innerHTML,
      text: container.textContent || "",
    };
  };

export default renderMessageContent;
