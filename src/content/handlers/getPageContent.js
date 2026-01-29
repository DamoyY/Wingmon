import { assignLlmIds, insertViewportMarker } from "../dom/index.js";
import { convertPageContentToMarkdown } from "../markdown/index.js";

const handleGetPageContent = (sendResponse) => {
  if (!document.body) {
    sendResponse({ error: "页面没有可用的 body" });
    return;
  }
  let marker = null;
  try {
    marker = insertViewportMarker(document.body);
    assignLlmIds(document.body);
    const markdown = convertPageContentToMarkdown({
      body: document.body,
      title: document.title || "",
      url: window.location?.href || "",
    });
    sendResponse(markdown);
  } finally {
    if (marker && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};
export default handleGetPageContent;
