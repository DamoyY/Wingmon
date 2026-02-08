import { Tiktoken as JsTiktoken } from "js-tiktoken/lite";
import type { TokenLengthResolver } from "../../shared/index.ts";
import { createO200kBaseEncoding } from "./tiktokenEncoding.ts";
import o200kBase from "js-tiktoken/ranks/o200k_base";

type MarkdownEncoding = {
  encode: (text: string) => ArrayLike<number>;
  decode_single_token_bytes?: (token: number) => Uint8Array;
  textMap?: Map<number, Uint8Array>;
  inverseSpecialTokens?: Record<string, Uint8Array>;
};

type MarkdownTokenByteBoundaries = {
  tokenByteBoundaries: number[];
  totalTokens: number;
  totalBytes: number;
};

const utf8Encoder = new TextEncoder();

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

const resolveTokenBytes = (
  encoding: MarkdownEncoding,
  token: number,
): Uint8Array => {
  if (typeof encoding.decode_single_token_bytes === "function") {
    return encoding.decode_single_token_bytes(token);
  }
  const rankBytes = encoding.textMap?.get(token);
  if (rankBytes instanceof Uint8Array) {
    return rankBytes;
  }
  const specialTokenBytes = encoding.inverseSpecialTokens?.[String(token)];
  if (specialTokenBytes instanceof Uint8Array) {
    return specialTokenBytes;
  }
  console.error("无法解析 token 字节", {
    hasDecodeSingleTokenBytes:
      typeof encoding.decode_single_token_bytes === "function",
    hasInverseSpecialTokens: typeof encoding.inverseSpecialTokens === "object",
    hasTextMap: encoding.textMap instanceof Map,
    token,
  });
  throw new Error(`Unknown token id: ${String(token)}`);
};

const resolveMarkdownTokenByteBoundaries = (
  text: string,
): MarkdownTokenByteBoundaries => {
  const encodedTokens = markdownEncoding.encode(text),
    tokenByteBoundaries = [0];
  let totalTokenBytes = 0;
  for (let index = 0; index < encodedTokens.length; index += 1) {
    const token = encodedTokens[index];
    if (!Number.isInteger(token) || token < 0) {
      console.error("token id 非法", {
        index,
        token,
      });
      throw new Error("token id 非法");
    }
    const tokenBytes = resolveTokenBytes(markdownEncoding, token);
    totalTokenBytes += tokenBytes.length;
    tokenByteBoundaries.push(totalTokenBytes);
  }
  const totalBytes = utf8Encoder.encode(text).length;
  if (totalTokenBytes !== totalBytes) {
    console.error("token 字节长度与文本 UTF-8 字节长度不一致", {
      tokenBytes: totalTokenBytes,
      utf8Bytes: totalBytes,
    });
    throw new Error("token 字节偏移计算失败");
  }
  return {
    tokenByteBoundaries,
    totalBytes,
    totalTokens: encodedTokens.length,
  };
};

export { resolveMarkdownTokenLength, resolveMarkdownTokenByteBoundaries };
export type { MarkdownTokenByteBoundaries };
