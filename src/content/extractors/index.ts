import convertPageContentToMarkdown, {
  type MarkdownPageContentCollection,
  convertPageContentToMarkdownPages,
} from "./converter.js";
import convertPdfToMarkdown, {
  type MarkdownPdfPageCollection,
  convertPdfToMarkdownPages,
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
