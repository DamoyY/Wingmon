declare module "@opendocsg/pdf2md" {
  const pdf2md: (
    input: ArrayBuffer | Uint8Array,
    callbacks?: Record<string, unknown>,
  ) => Promise<string>;
  export default pdf2md;
}
