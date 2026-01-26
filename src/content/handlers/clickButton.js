export const handleClickButton = (message, sendResponse) => {
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
    sendResponse({ error: `未找到 id 为 ${normalizedId} 的按钮` });
    return;
  }
  if (matches.length > 1) {
    sendResponse({ error: `找到多个 id 为 ${normalizedId} 的按钮` });
    return;
  }
  matches[0].click();
  sendResponse({ ok: true });
};
