import { normalizeUrl } from "../../shared/index.ts";

export { normalizeUrl };

export const isDataUrl = (url: string | null | undefined): boolean =>
  normalizeUrl(url).startsWith("data:");

export const isSvgUrl = (url: string | null | undefined): boolean =>
  /\.svg([?#]|$)/i.test(normalizeUrl(url));
