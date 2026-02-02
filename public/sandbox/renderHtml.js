const RENDER_TYPE = "renderHtml";

const handleRenderHtml = (message) => {
  const { html } = message;
  if (typeof html !== "string") {
    window.console.error("html 必须是字符串");
    return;
  }
  document.open();
  document.write(html);
  document.close();
};

const registerRenderHtmlListener = () => {
  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === RENDER_TYPE) {
      handleRenderHtml(data);
    }
  });
};

window.registerRenderHtmlListener = registerRenderHtmlListener;
