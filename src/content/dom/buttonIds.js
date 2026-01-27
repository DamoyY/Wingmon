const ID_LENGTH = 6;
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const MAX_RETRY = 200;
const createRandomId = () => {
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    throw new Error("浏览器不支持安全随机数生成");
  }
  const bytes = new Uint8Array(ID_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => ID_ALPHABET[value % ID_ALPHABET.length])
    .join("");
};
const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const usedIds = new Set();
  buttons.forEach((button) => {
    let resolvedId = "";
    for (let attempt = 0; attempt < MAX_RETRY; attempt += 1) {
      const candidate = createRandomId();
      if (!usedIds.has(candidate)) {
        resolvedId = candidate;
        usedIds.add(candidate);
        break;
      }
    }
    if (!resolvedId) {
      throw new Error("生成按钮 ID 失败：随机 ID 重复次数过多");
    }
    button.setAttribute("data-llm-id", resolvedId);
  });
};
export default assignLlmIds;
