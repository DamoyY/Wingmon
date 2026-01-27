import { assignLlmIds, insertViewportMarker } from "../dom/index.js";

const handleGetPageContent = (sendResponse) => {
  if (!document.body) {
    sendResponse({ error: "页面没有可用的 body" });
    return;
  }
  let marker = null;
  try {
    marker = insertViewportMarker(document.body);
    assignLlmIds(document.body);
    const html = document.body.innerHTML;
    sendResponse({
      html,
      title: document.title || "",
      url: window.location?.href || "",
    });
  } finally {
    if (marker && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};
export default handleGetPageContent;
