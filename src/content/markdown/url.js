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
    }, ""),
  normalizeUrl = (url) => stripControlAndWhitespace(normalizeUrlBase(url)),
  isDataUrl = (url) => normalizeUrl(url).startsWith("data:"),
  isSvgUrl = (url) => /\.svg([?#]|$)/i.test(normalizeUrl(url));

export { normalizeUrl, isDataUrl, isSvgUrl };
