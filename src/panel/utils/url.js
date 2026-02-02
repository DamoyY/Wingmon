const normalizeUrlBase = (url) => (url || "").trim().toLowerCase(),
  stripControlAndWhitespace = (value) =>
    Array.from(value).reduce((result, char) => {
      const code = char.codePointAt(0);
      if (code <= 31 || code === 127) {
        return result;
      }
      if (char.trim() === "") {
        return result;
      }
      return `${result}${char}`;
    }, "");
export const normalizeUrl = (url) =>
  stripControlAndWhitespace(normalizeUrlBase(url));
const internalPrefixes = [
    "chrome://",
    "edge://",
    "chrome-extension://",
    "edge-extension://",
    "devtools://",
    "chrome-untrusted://",
    "view-source:",
    "about:",
  ],
  storePrefixes = [
    "https://chromewebstore.google.com",
    "http://chromewebstore.google.com",
    "https://microsoftedge.microsoft.com",
    "http://microsoftedge.microsoft.com",
  ];
export const isInternalUrl = (url) => {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return false;
  }
  return (
    internalPrefixes.some((prefix) => normalized.startsWith(prefix)) ||
    storePrefixes.some((prefix) => normalized.startsWith(prefix))
  );
};
