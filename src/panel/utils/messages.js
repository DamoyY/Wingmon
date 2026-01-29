const ensureTextValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error("消息内容必须是字符串");
  }
  return value;
};

const filterTextSegments = (segments) =>
  segments
    .map((segment) => ensureTextValue(segment))
    .filter((segment) => Boolean(segment.trim()));

const combineMessageContents = (segments) => {
  if (!Array.isArray(segments)) {
    throw new Error("消息内容必须是数组");
  }
  return filterTextSegments(segments).join("\n\n");
};

export default combineMessageContents;
