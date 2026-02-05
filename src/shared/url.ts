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

const parseUrlCandidate = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, "https://invalid.local");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`PDF 地址解析失败：${message}`, error);
      return null;
    }
  }
};

const disallowedPdfProtocols = new Set([
  "javascript:",
  "mailto:",
  "tel:",
  "sms:",
]);

const hasPdfFromParsedUrl = (parsed: URL): boolean =>
  hasPdfMarker(parsed.pathname, "PDF 地址路径") ||
  hasPdfInSearchParams(parsed.search);

export const normalizeUrl = (url: string | null | undefined): string =>
  stripControlAndWhitespace(normalizeUrlBase(url));

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
    const embeddedParsed = parseUrlCandidate(embedded);
    if (embeddedParsed && hasPdfFromParsedUrl(embeddedParsed)) {
      return true;
    }
    return hasPdfMarker(embedded, "PDF Blob 地址");
  }

  const parsed = parseUrlCandidate(sanitized);
  if (!parsed) {
    return false;
  }

  if (disallowedPdfProtocols.has(parsed.protocol)) {
    return false;
  }

  return hasPdfFromParsedUrl(parsed);
};
