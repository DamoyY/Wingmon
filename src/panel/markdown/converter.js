import { isDataUrl } from "./sanitize";

const TurndownService = window?.TurndownService;
if (typeof TurndownService !== "function") {
  throw new Error("TurndownService 未加载，无法转换页面内容");
}
export const turndown = new TurndownService({ codeBlockStyle: "fenced" });
turndown.remove(["script", "style"]);
turndown.addRule("image", {
  filter: "img",
  replacement: (_content, node) => {
    if (!node || node.nodeName !== "IMG") {
      return "";
    }
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "";
    if (!src || isDataUrl(src)) {
      return turndown.escape(alt);
    }
    const title = node.getAttribute("title");
    const titlePart = title ? ` "${turndown.escape(title)}"` : "";
    return `![${turndown.escape(alt)}](${src}${titlePart})`;
  },
});
export const convertPageContentToMarkdown = (pageData) => {
  if (!pageData || typeof pageData.html !== "string") {
    throw new Error("页面内容为空");
  }
  if (!pageData.html.trim()) {
    throw new Error("页面内容为空");
  }
  if (typeof DOMParser !== "function") {
    throw new Error("DOMParser 不可用，无法解析页面 HTML");
  }
  const parser = new DOMParser();
  const documentResult = parser.parseFromString(pageData.html, "text/html");
  if (!documentResult?.body) {
    throw new Error("解析页面 HTML 失败");
  }
  const normalizeText = (value) => (value || "").trim();
  const getLabelFromIds = (ids) => {
    const labels = ids.map((id) => {
      const target = documentResult.getElementById(id);
      if (!target) {
        throw new Error(`aria-labelledby 指向不存在的按钮: ${id}`);
      }
      return normalizeText(target.textContent);
    });
    const merged = labels.filter(Boolean).join(" ").trim();
    return merged || "";
  };
  const getButtonLabel = (button) => {
    const directText =
      button.tagName === "INPUT" ? button.value : button.textContent;
    const normalizedText = normalizeText(directText);
    if (normalizedText) {
      return normalizedText;
    }
    const ariaLabel = normalizeText(button.getAttribute("aria-label"));
    if (ariaLabel) {
      return ariaLabel;
    }
    const ariaLabelledby = normalizeText(
      button.getAttribute("aria-labelledby"),
    );
    if (ariaLabelledby) {
      const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
      if (!ids.length) {
        throw new Error("aria-labelledby 为空，无法解析按钮名称");
      }
      const labeledText = getLabelFromIds(ids);
      if (labeledText) {
        return labeledText;
      }
    }
    const titleText = normalizeText(button.getAttribute("title"));
    if (titleText) {
      return titleText;
    }
    const imgAlt = normalizeText(
      button.querySelector("img")?.getAttribute("alt"),
    );
    if (imgAlt) {
      return imgAlt;
    }
    const svgTitle = normalizeText(
      button.querySelector("svg title")?.textContent,
    );
    if (svgTitle) {
      return svgTitle;
    }
    const svgLabel = normalizeText(
      button.querySelector("svg")?.getAttribute("aria-label"),
    );
    if (svgLabel) {
      return svgLabel;
    }
    return "未命名按钮";
  };
  const buttons = documentResult.body.querySelectorAll("[data-llm-id]");
  buttons.forEach((buttonNode) => {
    const button = buttonNode;
    const id = normalizeText(button.getAttribute("data-llm-id"));
    if (!id) {
      throw new Error("按钮缺少 data-llm-id");
    }
    const text = getButtonLabel(button);
    const replacement = `[button: "${text}", id: "${id}"]`;
    button.textContent = replacement;
    if (button.tagName === "INPUT") {
      button.value = replacement;
      button.setAttribute("value", replacement);
    }
  });
  const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";
  const viewportMarker = documentResult.body.querySelector(
    "[data-llm-viewport-center]",
  );
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位截取范围");
  }
  viewportMarker.textContent = viewportMarkerToken;
  const processedHtml = documentResult.body.innerHTML;
  const content = turndown.turndown(processedHtml);
  const markerIndex = content.indexOf(viewportMarkerToken);
  if (markerIndex < 0) {
    throw new Error("视口中心标记丢失，无法定位截取范围");
  }
  const range = 20000;
  const start = Math.max(0, markerIndex - range);
  const end = Math.min(
    content.length,
    markerIndex + viewportMarkerToken.length + range,
  );
  const hasLeadingCut = start > 0;
  const hasTrailingCut = end < content.length;
  let sliced = content.slice(start, end);
  sliced = sliced.replace(viewportMarkerToken, "");
  if (hasLeadingCut) {
    sliced = `[[TRUNCATED_START]]\n${sliced}`;
  }
  if (hasTrailingCut) {
    sliced = `${sliced}\n[[TRUNCATED_END]]`;
  }
  return {
    title: pageData.title || "",
    url: pageData.url || "",
    content: sliced,
  };
};
