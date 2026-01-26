const normalizeUrlBase = (url) => (url || "").trim().toLowerCase();
export const normalizeUrl = (url) =>
  normalizeUrlBase(url).replace(/[\u0000-\u001F\u007F\s]+/g, "");
export const createRandomId = (prefix) => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const tag = prefix ? `${prefix}_` : "";
  return `${tag}${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
