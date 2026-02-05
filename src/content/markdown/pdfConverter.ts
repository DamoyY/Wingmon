import { parse } from "@opendocsg/pdf2md/lib/util/pdf";
import {
  makeTransformations,
  transform,
} from "@opendocsg/pdf2md/lib/util/transformations";

type PageContentData = {
  title?: string;
  url?: string;
  pageNumber?: number;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
};

type PdfDocument = {
  cleanup?: (keepLoadedFonts?: boolean) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
};

type PdfParseResult = {
  fonts: { map: Map<string, unknown> };
  pages: Array<{ items: unknown[] }>;
  pdfDocument?: PdfDocument;
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

const resolvePageNumber = (pageData?: PageContentData | null): number => {
  const value = pageData?.pageNumber;
  if (value === undefined) {
    return 1;
  }
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new Error("page_number 必须是正整数");
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

const cleanupPdfDocument = async (
  pdfDocument: PdfDocument | undefined,
): Promise<void> => {
  if (!pdfDocument) {
    return;
  }
  if (typeof pdfDocument.cleanup === "function") {
    try {
      await pdfDocument.cleanup(false);
    } catch (error) {
      console.error("PDF 清理失败", error);
    }
  }
  if (typeof pdfDocument.destroy === "function") {
    try {
      await pdfDocument.destroy();
    } catch (error) {
      console.error("PDF 销毁失败", error);
    }
  }
};

const buildMarkdownContent = (
  parsed: PdfParseResult,
  pageNumber: number,
): string => {
  if (!Array.isArray(parsed.pages) || !parsed.pages.length) {
    throw new Error("PDF 内容为空");
  }
  const pageIndex = pageNumber - 1;
  if (pageIndex < 0 || pageIndex >= parsed.pages.length) {
    throw new Error(`PDF 页码超出范围：${String(pageNumber)}`);
  }
  const transformations = makeTransformations(parsed.fonts.map);
  const parseResult = transform(parsed.pages, transformations);
  const targetPage = parseResult.pages.at(pageIndex);
  if (!targetPage || !Array.isArray(targetPage.items)) {
    throw new Error("PDF 转换结果无效");
  }
  const lines = targetPage.items.map((item) => {
    if (typeof item !== "string") {
      throw new Error("PDF 转换结果无效");
    }
    return item;
  });
  return `${lines.join("\n")}\n`;
};

const convertPdfToMarkdown = async (
  pageData?: PageContentData | null,
): Promise<MarkdownPageContent> => {
  const url = resolveUrl(pageData),
    title = resolveTitle(pageData),
    pageNumber = resolvePageNumber(pageData),
    pdfBytes = await fetchPdfBytes(url);
  let pdfDocument: PdfDocument | undefined;
  try {
    const parsed = (await parse(pdfBytes)) as PdfParseResult;
    pdfDocument = parsed.pdfDocument;
    const content = buildMarkdownContent(parsed, pageNumber);
    return {
      title,
      url,
      content,
    };
  } finally {
    await cleanupPdfDocument(pdfDocument);
  }
};

export default convertPdfToMarkdown;
