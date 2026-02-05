import { normalizeUrl } from "../../shared/index.ts";

const internalPrefixes = [
  "chrome://",
  "edge://",
  "chrome-extension://",
  "edge-extension://",
  "devtools://",
  "chrome-untrusted://",
  "view-source:",
  "about:",
];
const storePrefixes = [
  "https://chromewebstore.google.com",
  "http://chromewebstore.google.com",
  "https://microsoftedge.microsoft.com",
  "http://microsoftedge.microsoft.com",
];

const hasMatchingPrefix = (url: string, prefixes: string[]): boolean =>
  prefixes.some((prefix) => url.startsWith(prefix));

export { normalizeUrl };

export const isInternalUrl = (url: string | null | undefined): boolean => {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return false;
  }
  return (
    hasMatchingPrefix(normalized, internalPrefixes) ||
    hasMatchingPrefix(normalized, storePrefixes)
  );
};
