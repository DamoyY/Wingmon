const normalizeUrlBase = (url) => (url || "").trim().toLowerCase();
const stripControlAndWhitespace = (value) => {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code <= 31 || code === 127) {
      continue;
    }
    if (char.trim() === "") {
      continue;
    }
    result += char;
  }
  return result;
};
export const normalizeUrl = (url) =>
  stripControlAndWhitespace(normalizeUrlBase(url));
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
