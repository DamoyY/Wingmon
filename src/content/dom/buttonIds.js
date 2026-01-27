const ID_LENGTH = 6;
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const MAX_RETRY = 200;
const createRandomId = () => {
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    throw new Error("浏览器不支持安全随机数生成");
  }
  const bytes = new Uint8Array(ID_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let id = "";
  for (const value of bytes) {
    id += ID_ALPHABET[value % ID_ALPHABET.length];
  }
  return id;
};
export const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const usedIds = new Set();
  buttons.forEach((button) => {
    let id = "";
    let attempts = 0;
    while (true) {
      attempts += 1;
      if (attempts > MAX_RETRY) {
        throw new Error("生成按钮 ID 失败：随机 ID 重复次数过多");
      }
      id = createRandomId();
      if (!usedIds.has(id)) break;
    }
    usedIds.add(id);
    button.setAttribute("data-llm-id", id);
  });
};
