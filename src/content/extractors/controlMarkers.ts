export { CONTROL_MARKER_PREFIXES } from "../../shared/index.ts";
import {
  buildChunkAnchorMarker,
  chunkAnchorAttribute,
  chunkAnchorMarkerPattern,
} from "../dom/chunkAnchors.js";

export type ChunkAnchorPoint = {
  id: string;
  index: number;
};

export type ControlMarkerExtraction = {
  anchors: ChunkAnchorPoint[];
  content: string;
  viewportIndex: number | null;
};

type ControlMarkerKind = "Button" | "Input";

const escapedBacktickToken = "\\`";
const escapedBacktickPattern = /`/gu;
const escapedButtonMarkerPattern =
  /<< Button \| text: \\`(?<text>[\s\S]*?)\\` \| id: \\`(?<id>[\s\S]*?)\\` >>/gu;
const escapedInputMarkerPattern =
  /<< Input \| text: \\`(?<text>[\s\S]*?)\\` \| id: \\`(?<id>[\s\S]*?)\\` >>/gu;

const composeControlMarker = (
  kind: ControlMarkerKind,
  text: string,
  id: string,
): string => `<< ${kind} | text: \`${text}\` | id: \`${id}\` >>`;

export const escapeControlMarkerField = (value: string): string =>
  value.replace(escapedBacktickPattern, escapedBacktickToken);

export const buildControlMarker = (
  kind: ControlMarkerKind,
  text: string,
  id: string,
): string =>
  composeControlMarker(
    kind,
    escapeControlMarkerField(text),
    escapeControlMarkerField(id),
  );

export const normalizeControlMarkersForMarkdown = (content: string): string =>
  content
    .replace(
      escapedButtonMarkerPattern,
      "<< Button | text: `$<text>` | id: `$<id>` >>",
    )
    .replace(
      escapedInputMarkerPattern,
      "<< Input | text: `$<text>` | id: `$<id>` >>",
    );

const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";

export const markViewportCenter = (root: HTMLElement): string => {
  const viewportMarker = root.querySelector("[data-llm-viewport-center]");
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位分片");
  }
  const markerParent = viewportMarker.parentNode;
  if (!markerParent) {
    throw new Error("视口中心标记缺少父节点");
  }
  markerParent.replaceChild(
    root.ownerDocument.createTextNode(viewportMarkerToken),
    viewportMarker,
  );
  return viewportMarkerToken;
};

export const insertChunkAnchorMarkers = (root: HTMLElement): void => {
  root.querySelectorAll(`[${chunkAnchorAttribute}]`).forEach((element) => {
    const anchorId = element.getAttribute(chunkAnchorAttribute);
    if (!anchorId) {
      return;
    }
    const marker = root.ownerDocument.createTextNode(
      buildChunkAnchorMarker(anchorId),
    );
    element.insertBefore(marker, element.firstChild);
  });
};

export const extractControlMarkers = (
  contentWithMarkers: string,
  markerToken: string | null,
): ControlMarkerExtraction => {
  let viewportMarkerLength = 0;
  if (typeof markerToken === "string" && markerToken.length > 0) {
    viewportMarkerLength = markerToken.length;
  }
  const shouldTrackViewportMarker = viewportMarkerLength > 0;
  const anchors: ChunkAnchorPoint[] = [];
  const cleanSegments: string[] = [];
  let cursor = 0;
  let cleanLength = 0;
  let viewportIndex: number | null = null;
  let trailingLineBreakCount = 0;
  const appendNormalizedSegment = (segment: string): void => {
    if (!segment) {
      return;
    }
    let index = 0;
    while (index < segment.length) {
      const current = segment[index];
      if (current === "\r" && segment[index + 1] === "\n") {
        if (trailingLineBreakCount < 2) {
          cleanLength += 1;
          cleanSegments.push("\n");
          trailingLineBreakCount += 1;
        }
        index += 2;
        continue;
      }
      if (current === "\n") {
        if (trailingLineBreakCount < 2) {
          cleanLength += 1;
          cleanSegments.push("\n");
          trailingLineBreakCount += 1;
        }
        index += 1;
        continue;
      }
      const codePoint = segment.codePointAt(index);
      if (typeof codePoint !== "number") {
        throw new Error("文本分段解析失败");
      }
      const character = String.fromCodePoint(codePoint);
      cleanSegments.push(character);
      cleanLength += character.length;
      index += character.length;
      trailingLineBreakCount = 0;
    }
  };
  const anchorPattern = new RegExp(chunkAnchorMarkerPattern.source, "g");
  while (cursor < contentWithMarkers.length) {
    anchorPattern.lastIndex = cursor;
    const anchorMatch = anchorPattern.exec(contentWithMarkers);
    const anchorStart = anchorMatch ? anchorMatch.index : -1;
    const viewportStart = shouldTrackViewportMarker
      ? contentWithMarkers.indexOf(markerToken, cursor)
      : -1;
    let markerStart = contentWithMarkers.length;
    let markerType: "anchor" | "viewport" | null = null;
    if (anchorStart >= 0 && anchorStart < markerStart) {
      markerStart = anchorStart;
      markerType = "anchor";
    }
    if (viewportStart >= 0 && viewportStart < markerStart) {
      markerStart = viewportStart;
      markerType = "viewport";
    }
    const segment = contentWithMarkers.slice(cursor, markerStart);
    appendNormalizedSegment(segment);
    if (!markerType) {
      break;
    }
    if (markerType === "viewport") {
      if (viewportIndex !== null) {
        throw new Error("视口中心标记重复，无法计算分片");
      }
      viewportIndex = cleanLength;
      cursor = markerStart + viewportMarkerLength;
      continue;
    }
    const anchorId = anchorMatch?.[1];
    if (!anchorId) {
      throw new Error("页面分块锚点标记无效");
    }
    anchors.push({
      id: anchorId,
      index: cleanLength,
    });
    cursor = markerStart + anchorMatch[0].length;
  }
  if (shouldTrackViewportMarker && viewportIndex === null) {
    throw new Error("视口中心标记丢失，无法计算分片");
  }
  return {
    anchors,
    content: cleanSegments.join(""),
    viewportIndex,
  };
};
