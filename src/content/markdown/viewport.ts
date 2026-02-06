import { createO200kBaseEncoding } from "./tiktokenEncoding.ts";

type ViewportEncoding = {
  encode: (text: string) => number[];
  decode: (tokens: number[]) => Uint8Array;
};

const createViewportEncoding = (): ViewportEncoding => {
    try {
      const encoding = createO200kBaseEncoding();
      return {
        encode: (text: string): number[] => Array.from(encoding.encode(text)),
        decode: (tokens: number[]): Uint8Array =>
          encoding.decode(Uint32Array.from(tokens)),
      };
    } catch (error) {
      console.error("tiktoken 初始化失败", error);
      throw error;
    }
  },
  viewportMarkerToken = "LLMVIEWPORTCENTERMARKER",
  viewportEncoding = createViewportEncoding(),
  textDecoder = new TextDecoder(),
  decodeTokensToString = (tokens: number[]): string => {
    if (tokens.length === 0) {
      return "";
    }
    return textDecoder.decode(viewportEncoding.decode(tokens));
  },
  markViewportCenter = (root: HTMLElement): string => {
    const viewportMarker = root.querySelector("[data-llm-viewport-center]");
    if (!viewportMarker) {
      throw new Error("未找到视口中心标记，无法定位截取范围");
    }
    viewportMarker.textContent = viewportMarkerToken;
    return viewportMarkerToken;
  },
  sliceContentAroundMarker = (
    content: string,
    markerToken: string,
    range = 5000,
  ): string => {
    if (!Number.isInteger(range) || range < 0) {
      throw new TypeError("截取范围必须是非负整数 token 数");
    }
    const markerIndex = content.indexOf(markerToken);
    if (markerIndex < 0) {
      throw new Error("视口中心标记丢失，无法定位截取范围");
    }
    const markerEndIndex = markerIndex + markerToken.length,
      contentBeforeMarker = content.slice(0, markerIndex),
      contentAfterMarker = content.slice(markerEndIndex),
      beforeTokens = viewportEncoding.encode(contentBeforeMarker),
      afterTokens = viewportEncoding.encode(contentAfterMarker),
      beforeStart = Math.max(0, beforeTokens.length - range),
      afterEnd = Math.min(afterTokens.length, range),
      hasLeadingCut = beforeStart > 0,
      hasTrailingCut = afterEnd < afterTokens.length,
      slicedBefore = decodeTokensToString(beforeTokens.slice(beforeStart)),
      slicedAfter = decodeTokensToString(afterTokens.slice(0, afterEnd));
    let sliced = `${slicedBefore}${slicedAfter}`;
    if (hasLeadingCut) {
      sliced = `[[TRUNCATED_START]]\n${sliced}`;
    }
    if (hasTrailingCut) {
      sliced = `${sliced}\n[[TRUNCATED_END]]`;
    }
    return sliced;
  };

export { markViewportCenter, sliceContentAroundMarker };
