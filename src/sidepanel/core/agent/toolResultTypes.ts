export type PageReadToolResult = {
  tabId: number;
  title: string;
  url: string;
  content: string;
  isInternal: boolean;
  pageNumber?: number;
  totalPages?: number;
};

export type ClickButtonToolResult = PageReadToolResult;

export type GetPageMarkdownToolResult = PageReadToolResult;

export type OpenBrowserPageToolResult = PageReadToolResult;

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
