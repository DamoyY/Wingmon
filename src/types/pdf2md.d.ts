declare module "@opendocsg/pdf2md" {
  const pdf2md: (
    input: ArrayBuffer | Uint8Array,
    callbacks?: Record<string, unknown>,
  ) => Promise<string>;
  export default pdf2md;
}

declare module "@opendocsg/pdf2md/lib/util/pdf" {
  export const parse: (
    input: ArrayBuffer | Uint8Array,
    callbacks?: Record<string, unknown>,
  ) => Promise<{
    fonts: { map: Map<string, unknown> };
    pages: Array<{ items: unknown[] }>;
    pdfDocument?: {
      cleanup?: (keepLoadedFonts?: boolean) => Promise<void> | void;
      destroy?: () => Promise<void> | void;
    };
  }>;
}

declare module "@opendocsg/pdf2md/lib/util/transformations" {
  export const makeTransformations: (
    fontMap: Map<string, unknown>,
  ) => unknown[];
  export const transform: (
    pages: Array<{ items: unknown[] }>,
    transformations: unknown[],
  ) => { pages: Array<{ items: unknown[] }> };
}
