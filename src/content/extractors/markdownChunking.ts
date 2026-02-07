import {
  MARKDOWN_CHUNK_TOKENS,
  createPrefixTokenCounter,
  splitMarkdownByTokens,
  type MarkdownChunkResult,
} from "../../shared/index.ts";
import { CONTROL_MARKER_PREFIXES } from "./controlMarkers.ts";
import { resolveMarkdownTokenLength } from "./markdownTokenLength.ts";

type PrefixTokenCounter = (boundary: number) => number;

type MarkdownChunkingOutput = {
  chunked: MarkdownChunkResult;
  prefixTokenCounter: PrefixTokenCounter;
};

const chunkMarkdownContent = (content: string): MarkdownChunkingOutput => {
  const chunked = splitMarkdownByTokens(content, resolveMarkdownTokenLength, {
      tokensPerPage: MARKDOWN_CHUNK_TOKENS,
      controlMarkerPrefixes: CONTROL_MARKER_PREFIXES,
    }),
    prefixTokenCounter = createPrefixTokenCounter(
      content,
      resolveMarkdownTokenLength,
    );
  return {
    chunked,
    prefixTokenCounter,
  };
};

export { chunkMarkdownContent };
export type { MarkdownChunkingOutput, PrefixTokenCounter };
