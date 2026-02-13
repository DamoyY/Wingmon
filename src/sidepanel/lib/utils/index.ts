export { default as combineMessageContents } from "./combineMessageContents.ts";
export { ensureElement, requireElementById } from "./ensureElement.ts";
export {
  createRandomId,
  getCurrentLocale,
  isDataUrl,
  isInternalUrl,
  isPdfUrl,
  isSupportedImageUrl,
  isSvgUrl,
  normalizeIndices,
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeColorSafe,
  normalizeThemeVariant,
  normalizeUrl,
  parseIndicesKey,
  parseJson,
  resolveIndicesKey,
  resolveSupportedImageMimeType,
  resolveSupportedImageMimeTypeFromContentType,
  setLocale,
  t,
  translateDOM,
  DEFAULT_THEME_COLOR,
  DEFAULT_THEME_VARIANT,
} from "../../../shared/index.ts";
export type {
  JsonValue,
  SupportedImageMimeType,
  ThemeMode,
  ThemeVariant,
} from "../../../shared/index.ts";
