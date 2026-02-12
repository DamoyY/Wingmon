const normalizeUrlBase = (url: string | null | undefined): string =>
  (url ?? "").trim().toLowerCase();

const stripControlAndWhitespace = (value: string): string =>
  Array.from(value).reduce((result, char) => {
    const code = char.codePointAt(0);
    if (code === undefined) {
      console.error("URL 字符解析失败：无法获取字符码点", char);
      return result;
    }
    if (code <= 31 || code === 127) {
      return result;
    }
    if (char.trim() === "") {
      return result;
    }
    return `${result}${char}`;
  }, "");

const sanitizeUrlInput = (value: string | null | undefined): string =>
  stripControlAndWhitespace((value ?? "").trim());

const decodeUrlComponentSafely = (
  value: string,
  context: string,
): string | null => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${context} 解码失败：${message}`, error);
    return null;
  }
};

const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.charAt(end - 1) === "/") {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

const pdfPathPattern = new RegExp("(^|/)[^/]+\\.pdf($|/)", "i");

const hasPdfExtension = (value: string): boolean => {
  const trimmed = trimTrailingSlashes(value);
  if (!trimmed) {
    return false;
  }
  return pdfPathPattern.test(trimmed);
};

const hasPdfMarker = (value: string, context: string): boolean => {
  if (hasPdfExtension(value)) {
    return true;
  }
  const decoded = decodeUrlComponentSafely(value, context);
  if (decoded && decoded !== value) {
    return hasPdfExtension(decoded);
  }
  return false;
};

const hasPdfInSearchParams = (search: string): boolean => {
  if (!search) {
    return false;
  }
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  for (const [key, rawValue] of params) {
    const sanitizedValue = sanitizeUrlInput(rawValue);
    if (!sanitizedValue) {
      continue;
    }
    if (hasPdfMarker(sanitizedValue, `PDF 查询参数 ${key}`)) {
      return true;
    }
  }
  return false;
};

const parseUrlCandidate = (value: string, context: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, "https://invalid.local");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${context}解析失败：${message}`, error);
      return null;
    }
  }
};

const disallowedPdfProtocols = new Set([
  "javascript:",
  "mailto:",
  "sms:",
  "tel:",
]);

const hasPdfFromParsedUrl = (parsed: URL): boolean =>
  hasPdfMarker(parsed.pathname, "PDF 地址路径") ||
  hasPdfInSearchParams(parsed.search);

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const resolveSupportedImageMimeTypeByLabel = (
  value: string,
): SupportedImageMimeType | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "png") {
    return "image/png";
  }
  if (
    normalized === "jpg" ||
    normalized === "jpeg" ||
    normalized === "image/jpg"
  ) {
    return "image/jpeg";
  }
  if (normalized === "webp") {
    return "image/webp";
  }
  if (
    normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/webp"
  ) {
    return normalized;
  }
  return null;
};

export const resolveSupportedImageMimeTypeFromContentType = (
    value: string | null | undefined,
  ): SupportedImageMimeType | null => {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.split(";")[0]?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return resolveSupportedImageMimeTypeByLabel(normalized);
  },
  resolveDataUrlImageMimeType = (
    header: string,
  ): SupportedImageMimeType | null => {
    const normalizedHeader = header.trim().toLowerCase(),
      contentType = normalizedHeader.startsWith("data:")
        ? normalizedHeader.slice(5)
        : normalizedHeader;
    return resolveSupportedImageMimeTypeFromContentType(contentType);
  },
  resolveSupportedImageMimeTypeFromPath = (
    path: string,
    context: string,
  ): SupportedImageMimeType | null => {
    const trimmedPath = trimTrailingSlashes(path.trim());
    if (!trimmedPath) {
      return null;
    }
    const extensionMatch = /\.([a-z0-9]+)$/iu.exec(trimmedPath);
    if (!extensionMatch) {
      return null;
    }
    const extension = extensionMatch[1] || "";
    const mimeType = resolveSupportedImageMimeTypeByLabel(extension);
    if (mimeType !== null) {
      return mimeType;
    }
    const decodedPath = decodeUrlComponentSafely(trimmedPath, context);
    if (!decodedPath || decodedPath === trimmedPath) {
      return null;
    }
    const decodedExtensionMatch = /\.([a-z0-9]+)$/iu.exec(decodedPath);
    if (!decodedExtensionMatch) {
      return null;
    }
    const decodedExtension = decodedExtensionMatch[1] || "";
    return resolveSupportedImageMimeTypeByLabel(decodedExtension);
  };

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

export const normalizeUrl = (url: string | null | undefined): string =>
  stripControlAndWhitespace(normalizeUrlBase(url));

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

export const isDataUrl = (url: string | null | undefined): boolean =>
  normalizeUrl(url).startsWith("data:");

export const isSvgUrl = (url: string | null | undefined): boolean =>
  /\.svg([?#]|$)/u.test(normalizeUrl(url));

export const isPdfUrl = (url: string): boolean => {
  const sanitized = sanitizeUrlInput(url);
  if (!sanitized) {
    return false;
  }

  const lowercased = sanitized.toLowerCase();
  if (lowercased.startsWith("data:")) {
    const headerEnd = lowercased.indexOf(",");
    const header =
      headerEnd === -1 ? lowercased : lowercased.slice(0, headerEnd);
    return header.includes("application/pdf");
  }

  if (lowercased.startsWith("blob:")) {
    const embedded = sanitized.slice(5);
    if (!embedded) {
      return false;
    }
    const embeddedParsed = parseUrlCandidate(embedded, "PDF Blob 地址");
    if (embeddedParsed && hasPdfFromParsedUrl(embeddedParsed)) {
      return true;
    }
    return hasPdfMarker(embedded, "PDF Blob 地址");
  }

  const parsed = parseUrlCandidate(sanitized, "PDF 地址");
  if (!parsed) {
    return false;
  }

  if (disallowedPdfProtocols.has(parsed.protocol)) {
    return false;
  }

  return hasPdfFromParsedUrl(parsed);
};

export const resolveSupportedImageMimeType = (
  url: string,
): SupportedImageMimeType | null => {
  const sanitized = sanitizeUrlInput(url);
  if (!sanitized) {
    return null;
  }
  const lowercased = sanitized.toLowerCase();
  if (lowercased.startsWith("data:")) {
    const headerEnd = lowercased.indexOf(",");
    const header =
      headerEnd === -1 ? lowercased : lowercased.slice(0, headerEnd);
    return resolveDataUrlImageMimeType(header);
  }
  if (lowercased.startsWith("blob:")) {
    const embedded = sanitized.slice(5);
    if (!embedded) {
      return null;
    }
    const embeddedParsed = parseUrlCandidate(embedded, "图片 Blob 地址");
    if (embeddedParsed) {
      const mimeType = resolveSupportedImageMimeTypeFromPath(
        embeddedParsed.pathname,
        "图片 Blob 地址路径",
      );
      if (mimeType !== null) {
        return mimeType;
      }
    }
    return resolveSupportedImageMimeTypeFromPath(embedded, "图片 Blob 地址");
  }
  const parsed = parseUrlCandidate(sanitized, "图片地址");
  if (!parsed) {
    return null;
  }
  if (disallowedPdfProtocols.has(parsed.protocol)) {
    return null;
  }
  return resolveSupportedImageMimeTypeFromPath(parsed.pathname, "图片地址路径");
};

export const isSupportedImageUrl = (url: string): boolean =>
  resolveSupportedImageMimeType(url) !== null;
