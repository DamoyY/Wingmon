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

type MarkdownTokenSanitizationState = {
  originalByteOffset: number;
  sanitizedByteOffset: number;
  sanitizedByteToOriginalByte: number[];
  sanitizedTextParts: string[];
};

type MarkdownTokenSanitizationResult = {
  sanitizedByteToOriginalByte: number[];
  sanitizedText: string;
  totalOriginalBytes: number;
  totalSanitizedBytes: number;
};

const utf8Encoder = new TextEncoder();

const resolveMarkdownSpecialTokenPatternSource = (): string => {
  const specialTokens = Object.keys(o200kBase.special_tokens)
    .filter((token) => token.length > 0)
    .sort((left, right) => right.length - left.length);
  if (specialTokens.length === 0) {
    console.error("o200k_base special token 列表为空");
    throw new Error("o200k_base special token 列表为空");
  }
  return specialTokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join("|");
};

const markdownSpecialTokenPatternSource =
  resolveMarkdownSpecialTokenPatternSource();

const createMarkdownSpecialTokenPattern = (): RegExp => {
  return new RegExp(markdownSpecialTokenPatternSource, "gu");
};

const appendPreservedSegment = (
  segment: string,
  state: MarkdownTokenSanitizationState,
): void => {
  if (segment.length === 0) {
    return;
  }
  state.sanitizedTextParts.push(segment);
  const preservedBytes = utf8Encoder.encode(segment).length;
  for (let byteStep = 1; byteStep <= preservedBytes; byteStep += 1) {
    state.sanitizedByteToOriginalByte[state.sanitizedByteOffset + byteStep] =
      state.originalByteOffset + byteStep;
  }
  state.sanitizedByteOffset += preservedBytes;
  state.originalByteOffset += preservedBytes;
};

const sanitizeTextForTokenCounting = (
  text: string,
): MarkdownTokenSanitizationResult => {
  const state: MarkdownTokenSanitizationState = {
    originalByteOffset: 0,
    sanitizedByteOffset: 0,
    sanitizedByteToOriginalByte: [0],
    sanitizedTextParts: [],
  };
  let cursor = 0;
  const pattern = createMarkdownSpecialTokenPattern();
  let matched = pattern.exec(text);
  while (matched !== null) {
    const matchedToken = matched[0],
      matchedStart = matched.index;
    if (matchedToken.length === 0) {
      console.error("special token 匹配结果为空字符串", {
        pattern: markdownSpecialTokenPatternSource,
      });
      throw new Error("special token 匹配结果为空字符串");
    }
    appendPreservedSegment(text.slice(cursor, matchedStart), state);
    const removedBytes = utf8Encoder.encode(matchedToken).length;
    state.originalByteOffset += removedBytes;
    state.sanitizedByteToOriginalByte[state.sanitizedByteOffset] =
      state.originalByteOffset;
    cursor = matchedStart + matchedToken.length;
    matched = pattern.exec(text);
  }
  appendPreservedSegment(text.slice(cursor), state);
  const totalOriginalBytes = utf8Encoder.encode(text).length;
  if (state.originalByteOffset !== totalOriginalBytes) {
    console.error("原文本字节长度与遍历结果不一致", {
      traversedBytes: state.originalByteOffset,
      utf8Bytes: totalOriginalBytes,
    });
    throw new Error("原文本字节长度校验失败");
  }
  const sanitizedText = state.sanitizedTextParts.join("");
  const totalSanitizedBytes = utf8Encoder.encode(sanitizedText).length;
  if (state.sanitizedByteOffset !== totalSanitizedBytes) {
    console.error("清洗后文本字节长度与遍历结果不一致", {
      traversedBytes: state.sanitizedByteOffset,
      utf8Bytes: totalSanitizedBytes,
    });
    throw new Error("清洗文本字节长度校验失败");
  }
  if (state.sanitizedByteToOriginalByte.length !== totalSanitizedBytes + 1) {
    console.error("清洗文本字节映射长度不一致", {
      expectedLength: totalSanitizedBytes + 1,
      mappingLength: state.sanitizedByteToOriginalByte.length,
    });
    throw new Error("清洗文本字节映射长度无效");
  }
  const lastOriginalByte =
    state.sanitizedByteToOriginalByte[
      state.sanitizedByteToOriginalByte.length - 1
    ];
  if (
    !Number.isInteger(lastOriginalByte) ||
    lastOriginalByte !== totalOriginalBytes
  ) {
    console.error("清洗文本字节映射末端无效", {
      lastOriginalByte,
      totalOriginalBytes,
    });
    throw new Error("清洗文本字节映射末端无效");
  }
  return {
    sanitizedByteToOriginalByte: state.sanitizedByteToOriginalByte,
    sanitizedText,
    totalOriginalBytes,
    totalSanitizedBytes,
  };
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
  const sanitized = sanitizeTextForTokenCounting(text);
  return markdownEncoding.encode(sanitized.sanitizedText).length;
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
  const sanitized = sanitizeTextForTokenCounting(text),
    encodedTokens = markdownEncoding.encode(sanitized.sanitizedText),
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
  if (totalTokenBytes !== sanitized.totalSanitizedBytes) {
    console.error("token 字节长度与文本 UTF-8 字节长度不一致", {
      tokenBytes: totalTokenBytes,
      utf8Bytes: sanitized.totalSanitizedBytes,
    });
    throw new Error("token 字节偏移计算失败");
  }
  const mappedTokenByteBoundaries = tokenByteBoundaries.map(
    (sanitizedByteBoundary, index) => {
      if (
        !Number.isInteger(sanitizedByteBoundary) ||
        sanitizedByteBoundary < 0
      ) {
        console.error("token 字节边界无效", {
          index,
          sanitizedByteBoundary,
        });
        throw new Error("token 字节边界无效");
      }
      const originalByteBoundary =
        sanitized.sanitizedByteToOriginalByte[sanitizedByteBoundary];
      if (
        !Number.isInteger(originalByteBoundary) ||
        originalByteBoundary < 0 ||
        originalByteBoundary > sanitized.totalOriginalBytes
      ) {
        console.error("token 字节边界映射失败", {
          index,
          originalByteBoundary,
          sanitizedByteBoundary,
        });
        throw new Error("token 字节边界映射失败");
      }
      return originalByteBoundary;
    },
  );
  const mappedLastBoundary =
    mappedTokenByteBoundaries[mappedTokenByteBoundaries.length - 1];
  if (mappedLastBoundary !== sanitized.totalOriginalBytes) {
    console.error("token 字节边界末端与原文本总字节数不一致", {
      mappedLastBoundary,
      totalOriginalBytes: sanitized.totalOriginalBytes,
    });
    throw new Error("token 字节边界映射末端无效");
  }
  for (let index = 1; index < mappedTokenByteBoundaries.length; index += 1) {
    const previous = mappedTokenByteBoundaries[index - 1],
      current = mappedTokenByteBoundaries[index];
    if (!Number.isInteger(previous) || !Number.isInteger(current)) {
      console.error("token 字节边界映射包含非法值", {
        current,
        index,
        previous,
      });
      throw new Error("token 字节边界映射包含非法值");
    }
    if (current < previous) {
      console.error("token 字节边界映射未保持递增", {
        current,
        index,
        previous,
      });
      throw new Error("token 字节边界映射未保持递增");
    }
  }
  return {
    tokenByteBoundaries: mappedTokenByteBoundaries,
    totalBytes: sanitized.totalOriginalBytes,
    totalTokens: encodedTokens.length,
  };
};

export { resolveMarkdownTokenLength, resolveMarkdownTokenByteBoundaries };
export type { MarkdownTokenByteBoundaries };
