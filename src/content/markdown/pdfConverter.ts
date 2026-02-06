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

const buildMarkdownContent = (
  parsed: PdfParseResult,
  pageNumber: number,
): { content: string; totalPages: number } => {
  if (!Array.isArray(parsed.pages) || !parsed.pages.length) {
    throw new Error("PDF 内容为空");
  }
  const pageIndex = pageNumber - 1;
  if (pageIndex < 0 || pageIndex >= parsed.pages.length) {
    throw new Error(`PDF 页码超出范围：${String(pageNumber)}`);
  }
  const transformations = makeTransformations(parsed.fonts.map);
  const parseResult = transform(
    parsed.pages,
    transformations,
  ) as TransformedPdfResult;
  const targetPage = parseResult.pages[pageIndex];
  if (!targetPage || !Array.isArray(targetPage.items)) {
    throw new Error("PDF 转换结果无效");
  }
  const lines = targetPage.items.map((item) => {
    if (typeof item !== "string") {
      throw new Error("PDF 转换结果无效");
    }
    return item;
  });
  return {
    content: `${lines.join("\n")}\n`,
    totalPages: parsed.pages.length,
  };
};

const convertPdfToMarkdown = async (
  pageData: PageContentData | null = null,
): Promise<MarkdownPageContent> => {
  const url = resolveUrl(pageData),
    title = resolveTitle(pageData),
    pageNumber = resolvePageNumber(pageData),
    pdfBytes = await fetchPdfBytes(url);
  let pdfDocument: PdfDocument | null = null;
  try {
    const parsed = (await parse(pdfBytes)) as PdfParseResult;
    pdfDocument = parsed.pdfDocument ?? null;
    const { content, totalPages } = buildMarkdownContent(parsed, pageNumber);
    return {
      title,
      url,
      content,
      totalPages,
      pageNumber,
      viewportPage: pageNumber,
    };
  } finally {
    await cleanupPdfDocument(pdfDocument);
  }
};

export default convertPdfToMarkdown;
