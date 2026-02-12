import type { SupportedImageMimeType } from "../../../shared/index.ts";

export const isSupportedPageImageMimeType = (
  value: string,
): value is SupportedImageMimeType =>
  value === "image/png" || value === "image/jpeg" || value === "image/webp";

export type ToolImageInput =
  | {
      mimeType: SupportedImageMimeType;
      sourceType: "base64";
      data: string;
    }
  | {
      mimeType: SupportedImageMimeType;
      sourceType: "url";
      url: string;
    };

export type PageReadToolResult = {
  tabId: number;
  title: string;
  url: string;
  content: string;
  isInternal: boolean;
  imageInput?: ToolImageInput;
  pageNumber?: number;
  totalPages?: number;
};

export type ClickButtonToolResult = PageReadToolResult;

export type GetPageMarkdownToolResult = PageReadToolResult;

export type OpenBrowserPageToolResult = PageReadToolResult;

export type FindToolPageResult = {
  pageNumber: number;
  lines: string[];
};

export type FindToolResult = {
  pages: FindToolPageResult[];
};

export type EnterTextToolResult = {
  ok: boolean;
};

export type CloseBrowserPageItemToolResult = {
  tabId: number;
  ok: boolean;
};

export type CloseBrowserPageToolResult = {
  items: CloseBrowserPageItemToolResult[];
};
