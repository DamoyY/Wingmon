const normalizeButtonId = (message) => {
  const id = typeof message?.id === "string" ? message.id.trim() : "";
  if (!id) {
    throw new Error("id 必须是非空字符串");
  }
  if (!/^[0-9a-z]+$/i.test(id)) {
    throw new Error("id 仅支持字母数字");
  }
  return id.toLowerCase();
};
const findSingleButton = (normalizedId) => {
  const matches = document.querySelectorAll(`[data-llm-id="${normalizedId}"]`);
  if (!matches.length) {
    return null;
  }
  if (matches.length > 1) {
    throw new Error(`找到多个 id 为 ${normalizedId} 的按钮`);
  }
  return matches[0];
};
export const handleClickButton = (message, sendResponse) => {
  const normalizedId = normalizeButtonId(message);
  const target = findSingleButton(normalizedId);
  if (!target) {
    sendResponse({ error: `未找到 id 为 ${normalizedId} 的按钮` });
    return;
  }
  target.click();
  sendResponse({ ok: true });
};
export const handleClickButton = (message, sendResponse) => {
  const normalizedId = normalizeButtonId(message);
  const target = findSingleButton(normalizedId);
  if (!target) {
    sendResponse({ ok: false, reason: "not_found" });
    return;
  }
  target.click();
  sendResponse({ ok: true });
};
