export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isJsonObject = (value: unknown): value is JsonObject =>
  isRecord(value);

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) {
    return true;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }
  if (!isJsonObject(value)) {
    return false;
  }
  return Object.values(value).every((item) => isJsonValue(item));
};

export const ensureString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} 必须是字符串`);
  }
  return value;
};

export const resolveString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
