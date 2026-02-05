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

export const normalizeUrl = (url: string | null | undefined): string =>
  stripControlAndWhitespace(normalizeUrlBase(url));

export const isPdfUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".pdf");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PDF 地址解析失败：${message}`, error);
    return false;
  }
};
