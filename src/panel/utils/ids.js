export const createRandomId = (prefix) => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const tag = prefix ? `${prefix}_` : "";
  return `${tag}${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
