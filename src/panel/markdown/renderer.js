import { sanitizeRenderedHtml } from "./sanitize";

const markdown = window.markdownit({
  html: false,
  linkify: true,
  breaks: true,
});
const renderMarkdown = (content) =>
  sanitizeRenderedHtml(markdown.render(content || ""));
export default renderMarkdown;
