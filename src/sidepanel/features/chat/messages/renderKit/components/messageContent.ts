import { applyMessageHeadingTypography } from "../../../../../ui/theme/typography.ts";
import renderMessageContent from "../contentRenderer.ts";

const resolveMessageContentTypescaleClass = (role: string): string =>
  role === "user" ? "md-typescale-body-large" : "md-typescale-body-medium";

const renderMessageBody = (content: string): { html: string; text: string } =>
  renderMessageContent(content, {
    decorateContainer: applyMessageHeadingTypography,
  });

export const getMessageRenderedText = (contentEl: HTMLElement): string =>
  contentEl.getAttribute("data-rendered-text") ?? "";

export const setMessageContent = (
  contentEl: HTMLElement,
  content: string,
): string => {
  const rendered = renderMessageBody(content);
  contentEl.innerHTML = rendered.html;
  contentEl.setAttribute("data-rendered-text", rendered.text);
  return rendered.text;
};

export const createMessageContent = (
  content: string,
  role: string,
): HTMLDivElement => {
  const body = document.createElement("div");
  body.className = `message-content ${resolveMessageContentTypescaleClass(role)}`;
  setMessageContent(body, content);
  return body;
};
