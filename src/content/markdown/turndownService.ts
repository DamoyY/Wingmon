import TurndownService, { type TurndownRule } from "turndown";
import { tables } from "turndown-plugin-gfm";
import { isDataUrl, isSvgUrl } from "./url.ts";

const ensureTurndownService = (): void => {
    if (typeof TurndownService !== "function") {
      throw new Error("TurndownService 未加载，无法转换页面内容");
    }
  },
  buildImageRule = (service: TurndownService): TurndownRule => ({
    filter: "img",
    replacement: (_content, node) => {
      if (!(node instanceof Element) || node.nodeName !== "IMG") {
        return "";
      }
      const imageNode = node as HTMLImageElement,
        src = imageNode.getAttribute("src") || "",
        alt = imageNode.getAttribute("alt") || "";
      if (!src || isDataUrl(src)) {
        return service.escape(alt);
      }
      if (isSvgUrl(src)) {
        return `![${service.escape(alt)}]()`;
      }
      const title = imageNode.getAttribute("title"),
        titlePart = title ? ` "${service.escape(title)}"` : "";
      return `![${service.escape(alt)}](${src}${titlePart})`;
    },
  }),
  createTurndownService = (): TurndownService => {
    ensureTurndownService();
    const service = new TurndownService({ codeBlockStyle: "fenced" });
    service.use(tables);
    service.remove(["script", "style"]);
    service.addRule("image", buildImageRule(service));
    return service;
  };

export default createTurndownService;
