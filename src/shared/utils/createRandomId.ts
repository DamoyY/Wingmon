const createRandomId = (prefix: string): string => {
  if (typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const tag = prefix ? `${prefix}_` : "",
    timestamp = String(Date.now()),
    randomPart = Math.random().toString(16).slice(2);
  return `${tag}${timestamp}_${randomPart}`;
};
export default createRandomId;
