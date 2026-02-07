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
  content: string;
  viewportIndex: number;
  anchors: ChunkAnchorPoint[];
};

export const CONTROL_MARKER_PREFIXES = ["[button:", "[input:"] as const;

const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";

export const markViewportCenter = (root: HTMLElement): string => {
  const viewportMarker = root.querySelector("[data-llm-viewport-center]");
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位分片");
  }
  viewportMarker.textContent = viewportMarkerToken;
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
  markerToken: string,
): ControlMarkerExtraction => {
  const anchors: ChunkAnchorPoint[] = [];
  const cleanSegments: string[] = [];
  let cursor = 0;
  let cleanLength = 0;
  let viewportIndex: number | null = null;
  const anchorPattern = new RegExp(chunkAnchorMarkerPattern.source, "g");
  while (cursor < contentWithMarkers.length) {
    anchorPattern.lastIndex = cursor;
    const anchorMatch = anchorPattern.exec(contentWithMarkers);
    const anchorStart = anchorMatch ? anchorMatch.index : -1;
    const viewportStart = contentWithMarkers.indexOf(markerToken, cursor);
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
    if (segment) {
      cleanSegments.push(segment);
      cleanLength += segment.length;
    }
    if (!markerType) {
      break;
    }
    if (markerType === "viewport") {
      if (viewportIndex !== null) {
        throw new Error("视口中心标记重复，无法计算分片");
      }
      viewportIndex = cleanLength;
      cursor = markerStart + markerToken.length;
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
  if (viewportIndex === null) {
    throw new Error("视口中心标记丢失，无法计算分片");
  }
  return {
    content: cleanSegments.join(""),
    viewportIndex,
    anchors,
  };
};
