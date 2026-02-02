import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";
import { isDataUrl, isSvgUrl } from "./url.js";

const ensureTurndownService = () => {
    if (typeof TurndownService !== "function") {
      throw new Error("TurndownService 未加载，无法转换页面内容");
    }
  },
  buildImageRule = (service) => ({
    filter: "img",
    replacement: (_content, node) => {
      if (!node || node.nodeName !== "IMG") {
        return "";
      }
      const src = node.getAttribute("src") || "",
        alt = node.getAttribute("alt") || "";
      if (!src || isDataUrl(src)) {
        return service.escape(alt);
      }
      if (isSvgUrl(src)) {
        return `![${service.escape(alt)}]()`;
      }
      const title = node.getAttribute("title"),
        titlePart = title ? ` "${service.escape(title)}"` : "";
      return `![${service.escape(alt)}](${src}${titlePart})`;
    },
  }),
  createTurndownService = () => {
    ensureTurndownService();
    const service = new TurndownService({ codeBlockStyle: "fenced" });
    service.use(tables);
    service.remove(["script", "style"]);
    service.addRule("image", buildImageRule(service));
    return service;
  };

export default createTurndownService;
