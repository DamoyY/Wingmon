const viewportMarkerToken = "LLMVIEWPORTCENTERMARKER";

const markViewportCenter = (root) => {
  const viewportMarker = root.querySelector("[data-llm-viewport-center]");
  if (!viewportMarker) {
    throw new Error("未找到视口中心标记，无法定位截取范围");
  }
  viewportMarker.textContent = viewportMarkerToken;
  return viewportMarkerToken;
};

const sliceContentAroundMarker = (content, markerToken, range = 20000) => {
  const markerIndex = content.indexOf(markerToken);
  if (markerIndex < 0) {
    throw new Error("视口中心标记丢失，无法定位截取范围");
  }
  const start = Math.max(0, markerIndex - range);
  const end = Math.min(
    content.length,
    markerIndex + markerToken.length + range,
  );
  const hasLeadingCut = start > 0;
  const hasTrailingCut = end < content.length;
  let sliced = content.slice(start, end);
  sliced = sliced.replace(markerToken, "");
  if (hasLeadingCut) {
    sliced = `[[TRUNCATED_START]]\n${sliced}`;
  }
  if (hasTrailingCut) {
    sliced = `${sliced}\n[[TRUNCATED_END]]`;
  }
  return sliced;
};

export { markViewportCenter, sliceContentAroundMarker };
