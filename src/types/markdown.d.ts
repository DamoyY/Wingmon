declare module "*.md" {
  const content: string;
  export default content;
}

declare module "tiktoken/tiktoken_bg.wasm" {
  const content: BufferSource;
  export default content;
}
