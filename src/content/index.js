const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const buttonCount = buttons.length;
  const idBase = 36;
  const minIdLength = 4;
  const idLength =
    buttonCount <= 1 ? minIdLength : (
      Math.max(minIdLength, Math.ceil(Math.log(buttonCount) / Math.log(idBase)))
    );
  const usedIds = new Set();
  buttons.forEach((button, index) => {
    const id = index.toString(idBase).padStart(idLength, "0");
    if (usedIds.has(id)) {
      throw new Error(`生成按钮 ID 重复: ${id}`);
    }
    usedIds.add(id);
    button.setAttribute("data-llm-id", id);
  });
};

const handleGetPageContent = (sendResponse) => {
  if (!document.body) {
    sendResponse({ error: "页面没有可用的 body" });
    return;
  }
  assignLlmIds(document.body);
  const html = document.body.innerHTML;
  sendResponse({ html, title: document.title || "", url: location.href || "" });
};

const handleClickElement = (message, sendResponse) => {
  const id = typeof message?.id === "string" ? message.id.trim() : "";
  if (!id) {
    sendResponse({ error: "id 必须是非空字符串" });
    return;
  }
  if (!/^[0-9a-z]+$/i.test(id)) {
    sendResponse({ error: "id 仅支持字母数字" });
    return;
  }
  const normalizedId = id.toLowerCase();
  const matches = document.querySelectorAll(`[data-llm-id="${normalizedId}"]`);
  if (!matches.length) {
    sendResponse({ error: `未找到 id 为 ${normalizedId} 的元素` });
    return;
  }
  if (matches.length > 1) {
    sendResponse({ error: `找到多个 id 为 ${normalizedId} 的元素` });
    return;
  }
  matches[0].click();
  sendResponse({ ok: true });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message?.type === "getPageContent") {
      handleGetPageContent(sendResponse);
      return;
    }
    if (message?.type === "clickElement") {
      handleClickElement(message, sendResponse);
    }
  } catch (error) {
    sendResponse({ error: error?.message || "未知错误" });
  }
});
