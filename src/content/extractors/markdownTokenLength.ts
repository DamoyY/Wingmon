import { Tiktoken as JsTiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";
import type { TokenLengthResolver } from "../../shared/index.ts";
import { createO200kBaseEncoding } from "./tiktokenEncoding.ts";

type MarkdownEncoding = {
  encode: (text: string) => ArrayLike<number>;
};

const createMarkdownEncoding = (): MarkdownEncoding => {
  try {
    return createO200kBaseEncoding();
  } catch (wasmError) {
    console.info("tiktoken WASM 初始化失败，回退至 js-tiktoken", wasmError);
    try {
      return new JsTiktoken(o200kBase);
    } catch (jsError) {
      console.error("js-tiktoken 初始化失败", jsError);
      throw jsError;
    }
  }
};

const markdownEncoding = createMarkdownEncoding();

const resolveMarkdownTokenLength: TokenLengthResolver = (text): number => {
  return markdownEncoding.encode(text).length;
};

export { resolveMarkdownTokenLength };
