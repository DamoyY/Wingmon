import { isPdfUrl } from "../../shared/index.ts";

export const isPdfContentType = (): boolean => {
  return document.contentType.toLowerCase().includes("pdf");
};

export const hasPdfEmbed = (): boolean => {
  const body = document.querySelector("body");
  if (!body) {
    return false;
  }
  return Boolean(
    body.querySelector(
      "embed[type='application/pdf'], object[type='application/pdf']",
    ),
  );
};

export const isPdfDocument = (): boolean => {
  const url = window.location.href || "";
  return isPdfContentType() || hasPdfEmbed() || (url ? isPdfUrl(url) : false);
};
