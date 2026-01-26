export const parseJson = (text) => {
  if (typeof text !== "string") {
    throw new Error("JSON 输入必须是字符串");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 解析失败：${error.message}`);
  }
};
