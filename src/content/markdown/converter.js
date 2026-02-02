import replaceButtons from "./buttons.js";
import createTurndownService from "./turndownService.js";
import { markViewportCenter, sliceContentAroundMarker } from "./viewport.js";

const turndown = createTurndownService(),
  convertPageContentToMarkdown = (pageData) => {
    if (!pageData || !pageData.body) {
      throw new Error("页面内容为空");
    }
    if (typeof pageData.body.cloneNode !== "function") {
      throw new Error("页面内容为空");
    }
    const bodyClone = pageData.body.cloneNode(true);
    if (!bodyClone || typeof bodyClone.querySelector !== "function") {
      throw new Error("页面内容为空");
    }
    replaceButtons(bodyClone);
    const markerToken = markViewportCenter(bodyClone),
      content = turndown.turndown(bodyClone.innerHTML),
      sliced = sliceContentAroundMarker(content, markerToken);
    return {
      title: pageData.title || "",
      url: pageData.url || "",
      content: sliced,
    };
  };

export default convertPageContentToMarkdown;
