const filterTextSegments = (segments: readonly string[]): string[] =>
    segments.filter((segment) => Boolean(segment.trim())),
  combineMessageContents = (segments: readonly string[]): string =>
    filterTextSegments(segments).join("\n\n");

export default combineMessageContents;
