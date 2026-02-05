import * as tiktoken from "tiktoken/init";
import tiktokenWasmBytes from "tiktoken/tiktoken_bg.wasm";

const createViewportEncoding = () => {
    try {
      const wasmModule = new WebAssembly.Module(tiktokenWasmBytes),
        wasmInstance = new WebAssembly.Instance(wasmModule, {
          "./tiktoken_bg.js": tiktoken,
        });
      tiktoken.__wbg_set_wasm(wasmInstance.exports);
      return tiktoken.get_encoding("o200k_base");
    } catch (error) {
      console.error("tiktoken 初始化失败", error);
      throw error;
    }
  },
  viewportMarkerToken = "LLMVIEWPORTCENTERMARKER",
  viewportEncoding = createViewportEncoding(),
  textDecoder = new TextDecoder(),
  decodeTokensToString = (tokens) => {
    if (tokens.length === 0) {
      return "";
    }
    return textDecoder.decode(viewportEncoding.decode(tokens));
  },
  markViewportCenter = (root) => {
    const viewportMarker = root.querySelector("[data-llm-viewport-center]");
    if (!viewportMarker) {
      throw new Error("未找到视口中心标记，无法定位截取范围");
    }
    viewportMarker.textContent = viewportMarkerToken;
    return viewportMarkerToken;
  },
  sliceContentAroundMarker = (content, markerToken, range = 5000) => {
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
