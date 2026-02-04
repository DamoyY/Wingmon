import pdf2md from "@opendocsg/pdf2md";

type PageContentData = {
  title?: string;
  url?: string;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
};

const resolveTitle = (pageData?: PageContentData | null): string => {
  if (typeof pageData?.title === "string") {
    return pageData.title;
  }
  return document.title || "";
};

const resolveUrl = (pageData?: PageContentData | null): string => {
  if (typeof pageData?.url === "string" && pageData.url.trim()) {
    return pageData.url;
  }
  const current = window.location.href;
  if (!current) {
    throw new Error("PDF 地址为空");
  }
  return current;
};

const fetchPdfBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      `PDF 请求失败：${String(response.status)} ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error("PDF 内容为空");
  }
  return new Uint8Array(buffer);
};

const convertPdfToMarkdown = async (
  pageData?: PageContentData | null,
): Promise<MarkdownPageContent> => {
  const url = resolveUrl(pageData),
    title = resolveTitle(pageData),
    pdfBytes = await fetchPdfBytes(url),
    markdown = await pdf2md(pdfBytes);
  if (typeof markdown !== "string") {
    throw new Error("PDF 转换结果无效");
  }
  return {
    title,
    url,
    content: markdown,
  };
};

export default convertPdfToMarkdown;
