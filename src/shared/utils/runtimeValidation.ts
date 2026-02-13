export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type JsonSchemaType =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";

export type JsonSchema = {
  additionalProperties?: boolean;
  description?: string;
  items?: JsonSchema;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  pattern?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: JsonSchemaType | JsonSchemaType[];
};

type JsonSchemaValidationOptions = {
  createError?: (message: string) => Error;
  path?: string;
};

const jsonSchemaTypeLabelMap: Record<JsonSchemaType, string> = {
  array: "数组",
  boolean: "布尔值",
  integer: "整数",
  null: "null",
  number: "数字",
  object: "对象",
  string: "字符串",
};

const joinSchemaPath = (path: string, key: string): string => `${path}.${key}`;

const resolveExpectedSchemaTypeMessage = (types: JsonSchemaType[]): string =>
  types.map((type) => jsonSchemaTypeLabelMap[type]).join(" 或 ");

const resolveSchemaTypes = (schema: JsonSchema): JsonSchemaType[] => {
  const typeValue = schema.type;
  if (!typeValue) {
    throw new Error("Schema 缺少 type");
  }
  if (Array.isArray(typeValue)) {
    if (!typeValue.length) {
      throw new Error("Schema 的 type 不能为空数组");
    }
    return typeValue;
  }
  return [typeValue];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
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

export { isRecord };

const isSchemaTypeMatch = (
  value: JsonValue,
  expectedType: JsonSchemaType,
): boolean => {
  switch (expectedType) {
    case "array":
      return Array.isArray(value);
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "null":
      return value === null;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "object":
      return isJsonObject(value);
    case "string":
      return typeof value === "string";
  }
};

const resolveNumericValidationError = (
  value: number,
  schema: JsonSchema,
  path: string,
): string | null => {
  const minimum = schema.minimum;
  if (minimum === undefined) {
    return null;
  }
  if (!Number.isFinite(minimum)) {
    throw new Error(`Schema ${path}.minimum 必须是有限数字`);
  }
  if (value < minimum) {
    return `${path} 不能小于 ${String(minimum)}`;
  }
  return null;
};

const resolveStringValidationError = (
  value: string,
  schema: JsonSchema,
  path: string,
): string | null => {
  const minLength = schema.minLength;
  if (minLength !== undefined) {
    if (!Number.isInteger(minLength) || minLength < 0) {
      throw new Error(`Schema ${path}.minLength 必须是非负整数`);
    }
    if (value.length < minLength) {
      return `${path} 长度不能小于 ${String(minLength)}`;
    }
  }
  const pattern = schema.pattern;
  if (pattern === undefined) {
    return null;
  }
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "u");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Schema ${path}.pattern 无效：${message}`);
  }
  if (!regex.test(value)) {
    return `${path} 格式不正确`;
  }
  return null;
};

const resolveArrayValidationError = (
  value: JsonArray,
  schema: JsonSchema,
  path: string,
): string | null => {
  const minItems = schema.minItems;
  if (minItems !== undefined) {
    if (!Number.isInteger(minItems) || minItems < 0) {
      throw new Error(`Schema ${path}.minItems 必须是非负整数`);
    }
    if (value.length < minItems) {
      return `${path} 至少需要 ${String(minItems)} 项`;
    }
  }
  const itemSchema = schema.items;
  if (!itemSchema) {
    return null;
  }
  for (let index = 0; index < value.length; index += 1) {
    const itemError = resolveJsonSchemaValidationError(
      value[index],
      itemSchema,
      `${path}[${String(index)}]`,
    );
    if (itemError !== null) {
      return itemError;
    }
  }
  return null;
};

const resolveObjectValidationError = (
  value: JsonObject,
  schema: JsonSchema,
  path: string,
): string | null => {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return `${joinSchemaPath(path, key)} 缺失`;
    }
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        return `${joinSchemaPath(path, key)} 不被允许`;
      }
    }
  }
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      continue;
    }
    const propertyError = resolveJsonSchemaValidationError(
      value[key],
      propertySchema,
      joinSchemaPath(path, key),
    );
    if (propertyError !== null) {
      return propertyError;
    }
  }
  return null;
};

export const resolveJsonSchemaValidationError = (
  value: JsonValue,
  schema: JsonSchema,
  path: string,
): string | null => {
  const expectedTypes = resolveSchemaTypes(schema);
  const matchedType = expectedTypes.find((expectedType) =>
    isSchemaTypeMatch(value, expectedType),
  );
  if (!matchedType) {
    return `${path} 必须是 ${resolveExpectedSchemaTypeMessage(expectedTypes)}`;
  }
  switch (matchedType) {
    case "array":
      if (!Array.isArray(value)) {
        return `${path} 必须是数组`;
      }
      return resolveArrayValidationError(value, schema, path);
    case "boolean":
    case "null":
      return null;
    case "integer":
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return `${path} 必须是数字`;
      }
      return resolveNumericValidationError(value, schema, path);
    case "object":
      if (!isJsonObject(value)) {
        return `${path} 必须是对象`;
      }
      return resolveObjectValidationError(value, schema, path);
    case "string":
      if (typeof value !== "string") {
        return `${path} 必须是字符串`;
      }
      return resolveStringValidationError(value, schema, path);
  }
};

export const validateJsonSchemaValue = (
  value: JsonValue,
  schema: JsonSchema,
  options: JsonSchemaValidationOptions = {},
): void => {
  const errorFactory =
    options.createError ?? ((message: string): Error => new Error(message));
  const path = options.path ?? "值";
  const errorMessage = resolveJsonSchemaValidationError(value, schema, path);
  if (errorMessage !== null) {
    throw errorFactory(errorMessage);
  }
};

export const isJsonSchemaValue = (
  value: unknown,
  schema: JsonSchema,
): value is JsonValue => {
  if (!isJsonValue(value)) {
    return false;
  }
  return resolveJsonSchemaValidationError(value, schema, "值") === null;
};

export const ensureString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} 必须是字符串`);
  }
  return value;
};

export const resolveString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
