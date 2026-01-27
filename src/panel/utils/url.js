const normalizeUrlBase = (url) => (url || "").trim().toLowerCase();
export const normalizeUrl = (url) =>
  normalizeUrlBase(url).replace(/[\u0000-\u001F\u007F\s]+/g, "");
export const isInternalUrl = (url) => {
  const normalized = normalizeUrl(url);
  return (
    normalized.startsWith("chrome://") ||
    normalized.startsWith("edge://") ||
    normalized.startsWith("https://chromewebstore.google.com") ||
    normalized.startsWith("http://chromewebstore.google.com") ||
    normalized.startsWith("https://microsoftedge.microsoft.com") ||
    normalized.startsWith("http://microsoftedge.microsoft.com")
  );
};
