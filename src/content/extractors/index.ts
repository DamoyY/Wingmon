import convertPageContentToMarkdown, {
  convertPageContentToMarkdownPages,
  type MarkdownPageContentCollection,
} from "./converter.js";
import convertPdfToMarkdown, {
  convertPdfToMarkdownPages,
  type MarkdownPdfPageCollection,
} from "./pdfConverter.js";

export { default as replaceButtons } from "./buttons.js";
export { default as createTurndownService } from "./turndownService.ts";
export { normalizeUrl, isDataUrl, isSvgUrl } from "../../shared/index.ts";
export { convertPageContentToMarkdown };
export { convertPdfToMarkdown };
export {
  convertPageContentToMarkdownPages,
  convertPdfToMarkdownPages,
  type MarkdownPageContentCollection,
  type MarkdownPdfPageCollection,
};
export default convertPageContentToMarkdown;
