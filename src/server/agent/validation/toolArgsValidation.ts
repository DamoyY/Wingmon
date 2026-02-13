import {
  type JsonSchema,
  type JsonValue,
  validateJsonSchemaValue as validateSharedJsonSchemaValue,
} from "../../../shared/index.ts";
import ToolInputError from "../errors.ts";

export type ToolJsonSchema = JsonSchema;

export const validateJsonSchemaValue = (
  value: JsonValue,
  schema: ToolJsonSchema,
  path = "工具参数",
): void => {
  validateSharedJsonSchemaValue(value, schema, {
    createError: (message) => new ToolInputError(message),
    path,
  });
};

export const createToolArgsValidator =
  (schema: ToolJsonSchema) =>
  (args: JsonValue): JsonValue => {
    validateJsonSchemaValue(args, schema);
    return args;
  };
