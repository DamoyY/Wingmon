import { getHtmlPreview, normalizePreviewHtml } from "../../../shared/index.ts";

const buildRenderHtmlMessage = (html) => ({
  html,
  type: "renderHtml",
});

const loadPreview = async () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    console.error("HTML 预览缺少 ID");
    return;
  }
  try {
    const entry = await getHtmlPreview(id);
    if (!entry) {
      console.error("HTML 预览记录不存在", id);
      return;
    }
    const normalizedCode = normalizePreviewHtml(entry.code),
      iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("public/sandbox.html");
    iframe.style.cssText =
      "width: 100vw; height: 100vh; border: none; position: fixed; top: 0; left: 0; display: block;";
    iframe.onload = () => {
      const targetWindow = iframe.contentWindow;
      if (!targetWindow) {
        console.error("sandbox iframe 未就绪");
        return;
      }
      targetWindow.postMessage(buildRenderHtmlMessage(normalizedCode), "*");
    };
    document.body.innerHTML = "";
    document.body.appendChild(iframe);
  } catch (error) {
    console.error("加载 HTML 预览失败", error);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  loadPreview();
});
