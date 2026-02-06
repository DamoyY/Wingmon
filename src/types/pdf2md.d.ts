declare module "@opendocsg/pdf2md" {
  type Pdf2MdCallbacks = Record<string, object>;

  const pdf2md: (
    input: ArrayBuffer | Uint8Array,
    callbacks?: Pdf2MdCallbacks,
  ) => Promise<string>;

  export default pdf2md;
}

declare module "@opendocsg/pdf2md/lib/util/pdf" {
  type PdfCallbacks = Record<string, object>;
  type PdfDocumentHandle = {
    cleanup?: (keepLoadedFonts?: boolean) => Promise<void> | void;
    destroy?: () => Promise<void> | void;
  };
  type PdfParseResult<TFont = object, TPageItem = string | object> = {
    fonts: { map: Map<string, TFont> };
    pages: Array<{ items: TPageItem[] }>;
    pdfDocument?: PdfDocumentHandle;
  };

  export const parse: <TFont = object, TPageItem = string | object>(
    input: ArrayBuffer | Uint8Array,
    callbacks?: PdfCallbacks,
  ) => Promise<PdfParseResult<TFont, TPageItem>>;
}

declare module "@opendocsg/pdf2md/lib/util/transformations" {
  type PdfTransformation = object;

  export const makeTransformations: <TFont = object>(
    fontMap: Map<string, TFont>,
  ) => PdfTransformation[];
  export const transform: <TPage>(
    pages: TPage[],
    transformations: PdfTransformation[],
  ) => { pages: TPage[] };
}
