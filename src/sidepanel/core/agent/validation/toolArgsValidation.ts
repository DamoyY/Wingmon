import type { JsonValue } from "../../../lib/utils/index.ts";
import ToolInputError from "../errors.ts";
import { isRecord } from "../../../../shared/index.ts";

type JsonSchemaType =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";

export type ToolJsonSchema = {
  additionalProperties?: boolean;
  description?: string;
  items?: ToolJsonSchema;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  pattern?: string;
  properties?: Record<string, ToolJsonSchema>;
  required?: string[];
  type?: JsonSchemaType | JsonSchemaType[];
};

type JsonObject = Record<string, JsonValue>;

const typeLabelMap: Record<JsonSchemaType, string> = {
    array: "数组",
    boolean: "布尔值",
    integer: "整数",
    null: "null",
    number: "数字",
    object: "对象",
    string: "字符串",
  },
  isJsonObject = (value: JsonValue): value is JsonObject => isRecord(value),
  joinPath = (path: string, key: string): string => `${path}.${key}`,
  resolveExpectedTypeMessage = (types: JsonSchemaType[]): string =>
    types.map((type) => typeLabelMap[type]).join(" 或 "),
  resolveSchemaTypes = (schema: ToolJsonSchema): JsonSchemaType[] => {
    const typeValue = schema.type;
    if (!typeValue) {
      throw new Error("工具参数 Schema 缺少 type");
    }
    if (Array.isArray(typeValue)) {
      if (!typeValue.length) {
        throw new Error("工具参数 Schema 的 type 不能为空数组");
      }
      return typeValue;
    }
    return [typeValue];
  },
  validateNumericConstraints = (
    value: number,
    schema: ToolJsonSchema,
    path: string,
  ) => {
    const { minimum } = schema;
    if (minimum === undefined) {
      return;
    }
    if (!Number.isFinite(minimum)) {
      throw new Error(`Schema ${path}.minimum 必须是有限数字`);
    }
    if (value < minimum) {
      throw new ToolInputError(`${path} 不能小于 ${String(minimum)}`);
    }
  },
  validateStringConstraints = (
    value: string,
    schema: ToolJsonSchema,
    path: string,
  ) => {
    const { minLength, pattern } = schema;
    if (minLength !== undefined) {
      if (!Number.isInteger(minLength) || minLength < 0) {
        throw new Error(`Schema ${path}.minLength 必须是非负整数`);
      }
      if (value.length < minLength) {
        throw new ToolInputError(`${path} 长度不能小于 ${String(minLength)}`);
      }
    }
    if (pattern === undefined) {
      return;
    }
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, "u");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Schema ${path}.pattern 无效：${message}`);
    }
    if (!regex.test(value)) {
      throw new ToolInputError(`${path} 格式不正确`);
    }
  },
  validateArrayConstraints = (
    value: JsonValue[],
    schema: ToolJsonSchema,
    path: string,
  ) => {
    const { minItems, items } = schema;
    if (minItems !== undefined) {
      if (!Number.isInteger(minItems) || minItems < 0) {
        throw new Error(`Schema ${path}.minItems 必须是非负整数`);
      }
      if (value.length < minItems) {
        throw new ToolInputError(`${path} 至少需要 ${String(minItems)} 项`);
      }
    }
    if (!items) {
      return;
    }
    value.forEach((item, index) => {
      validateJsonSchemaValue(item, items, `${path}[${String(index)}]`);
    });
  },
  validateObjectConstraints = (
    value: JsonObject,
    schema: ToolJsonSchema,
    path: string,
  ) => {
    const properties = schema.properties ?? {},
      required = schema.required ?? [];
    required.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        throw new ToolInputError(`${joinPath(path, key)} 缺失`);
      }
    });
    if (schema.additionalProperties === false) {
      Object.keys(value).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          throw new ToolInputError(`${joinPath(path, key)} 不被允许`);
        }
      });
    }
    Object.entries(properties).forEach(([key, propertySchema]) => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return;
      }
      validateJsonSchemaValue(value[key], propertySchema, joinPath(path, key));
    });
  },
  isTypeMatch = (value: JsonValue, expectedType: JsonSchemaType): boolean => {
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
  },
  validateByType = (
    value: JsonValue,
    schema: ToolJsonSchema,
    expectedType: JsonSchemaType,
    path: string,
  ) => {
    switch (expectedType) {
      case "array": {
        if (!Array.isArray(value)) {
          throw new ToolInputError(`${path} 必须是数组`);
        }
        validateArrayConstraints(value, schema, path);
        return;
      }
      case "boolean":
      case "null":
        return;
      case "integer":
      case "number": {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new ToolInputError(`${path} 必须是数字`);
        }
        validateNumericConstraints(value, schema, path);
        return;
      }
      case "object":
        if (!isJsonObject(value)) {
          throw new ToolInputError(`${path} 必须是对象`);
        }
        validateObjectConstraints(value, schema, path);
        return;
      case "string":
        if (typeof value !== "string") {
          throw new ToolInputError(`${path} 必须是字符串`);
        }
        validateStringConstraints(value, schema, path);
    }
  };

export const validateJsonSchemaValue = (
  value: JsonValue,
  schema: ToolJsonSchema,
  path = "工具参数",
): void => {
  const expectedTypes = resolveSchemaTypes(schema),
    matchedType = expectedTypes.find((expectedType) =>
      isTypeMatch(value, expectedType),
    );
  if (!matchedType) {
    throw new ToolInputError(
      `${path} 必须是 ${resolveExpectedTypeMessage(expectedTypes)}`,
    );
  }
  validateByType(value, schema, matchedType, path);
};

export const createToolArgsValidator =
  (schema: ToolJsonSchema) =>
  (args: JsonValue): JsonValue => {
    validateJsonSchemaValue(args, schema);
    return args;
  };
