type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

const parseJson = (text: string): JsonValue => {
  if (typeof text !== "string") {
    throw new Error("JSON 输入必须是字符串");
  }
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON 解析失败：${message}`);
  }
};
export default parseJson;
