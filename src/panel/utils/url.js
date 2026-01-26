const normalizeUrlBase = (url) => (url || "").trim().toLowerCase();
export const normalizeUrl = (url) =>
  normalizeUrlBase(url).replace(/[\u0000-\u001F\u007F\s]+/g, "");
