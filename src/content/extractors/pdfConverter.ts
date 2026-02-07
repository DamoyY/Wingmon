import { parse } from "@opendocsg/pdf2md/lib/util/pdf";
import {
  makeTransformations,
  transform,
} from "@opendocsg/pdf2md/lib/util/transformations";

type PageContentData = {
  title?: string | null;
  url?: string | null;
  pageNumber?: number | null;
};

type MarkdownPageContent = {
  title: string;
  url: string;
  content: string;
  totalPages: number;
  pageNumber: number;
  viewportPage: number;
};

export type MarkdownPdfPage = {
  pageNumber: number;
  content: string;
};

export type MarkdownPdfPageCollection = {
  title: string;
  url: string;
  totalPages: number;
  pages: MarkdownPdfPage[];
};

type PdfDocument = {
  cleanup?: (keepLoadedFonts?: boolean) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
};

type PdfPage = {
  items: string[];
};

type PdfParseResult = {
  fonts: { map: Map<string, object> };
  pages: PdfPage[];
  pdfDocument?: PdfDocument | null;
};

type TransformedPdfResult = {
  pages: Array<{ items: Array<string | object> } | null>;
};

const resolveTitle = (pageData: PageContentData | null = null): string => {
  if (typeof pageData?.title === "string") {
    return pageData.title;
  }
  return document.title || "";
};

const resolveUrl = (pageData: PageContentData | null = null): string => {
  if (typeof pageData?.url === "string" && pageData.url.trim()) {
    return pageData.url;
  }
  const current = window.location.href;
  if (!current) {
    throw new Error("PDF 地址为空");
  }
  return current;
};

const resolvePageNumber = (pageData: PageContentData | null = null): number => {
  const value = pageData?.pageNumber;
  if (value === null || typeof value !== "number") {
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
  pdfDocument: PdfDocument | null,
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

const buildMarkdownPages = (parsed: PdfParseResult): string[] => {
  if (!Array.isArray(parsed.pages) || !parsed.pages.length) {
    throw new Error("PDF 内容为空");
  }
  const transformations = makeTransformations(parsed.fonts.map);
  const parseResult = transform(
    parsed.pages,
    transformations,
  ) as TransformedPdfResult;
  return parseResult.pages.map((page, pageIndex) => {
    if (!page || !Array.isArray(page.items)) {
      throw new Error(`PDF 转换结果无效：第 ${String(pageIndex + 1)} 页`);
    }
    const lines = page.items.map((item) => {
      if (typeof item !== "string") {
        throw new Error(`PDF 转换结果无效：第 ${String(pageIndex + 1)} 页`);
      }
      return item;
    });
    return `${lines.join("\n")}\n`;
  });
};

export const convertPdfToMarkdownPages = async (
  pageData: PageContentData | null = null,
): Promise<MarkdownPdfPageCollection> => {
  const url = resolveUrl(pageData),
    title = resolveTitle(pageData),
    pdfBytes = await fetchPdfBytes(url);
  let pdfDocument: PdfDocument | null = null;
  try {
    const parsed = (await parse(pdfBytes)) as PdfParseResult;
    pdfDocument = parsed.pdfDocument ?? null;
    const pageContents = buildMarkdownPages(parsed);
    return {
      title,
      url,
      totalPages: pageContents.length,
      pages: pageContents.map((content, index) => ({
        pageNumber: index + 1,
        content,
      })),
    };
  } finally {
    await cleanupPdfDocument(pdfDocument);
  }
};

const convertPdfToMarkdown = async (
  pageData: PageContentData | null = null,
): Promise<MarkdownPageContent> => {
  const pageCollection = await convertPdfToMarkdownPages(pageData),
    pageNumber = resolvePageNumber(pageData),
    pageIndex = pageNumber - 1,
    targetPage = pageCollection.pages[pageIndex];
  if (pageIndex < 0 || pageIndex >= pageCollection.totalPages) {
    throw new Error(`PDF 页码超出范围：${String(pageNumber)}`);
  }
  return {
    title: pageCollection.title,
    url: pageCollection.url,
    content: targetPage.content,
    totalPages: pageCollection.totalPages,
    pageNumber: targetPage.pageNumber,
    viewportPage: targetPage.pageNumber,
  };
};

export default convertPdfToMarkdown;
