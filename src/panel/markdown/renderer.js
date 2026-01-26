import { sanitizeRenderedHtml } from "./sanitize.js";
const markdown = window.markdownit({
  html: false,
  linkify: true,
  breaks: true,
});
export const renderMarkdown = (content) =>
  sanitizeRenderedHtml(markdown.render(content || ""));
