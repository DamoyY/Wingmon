import ToolInputError from "../errors.js";

type ToolInputErrorCtor = new (message: string) => Error;

type ToolPrimitive = string | number | boolean | null;

export type ToolArgValue = ToolPrimitive | ToolPrimitive[];

export type ToolArgObject = Record<string, ToolArgValue>;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor,
  isToolArgObject = (
    value: ToolArgValue | ToolArgObject,
  ): value is ToolArgObject =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  readObjectField = (record: ToolArgObject, key: string): ToolArgValue =>
    Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null,
  parseTabId = (value: ToolArgValue, fieldPath: string): number => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    throw new ToolInputErrorSafe(`${fieldPath} 必须是正整数`);
  };

export const ensureObjectArgs = (
  args: ToolArgValue | ToolArgObject,
): ToolArgObject => {
  if (!isToolArgObject(args)) {
    throw new ToolInputErrorSafe("工具参数必须是对象");
  }
  return args;
};

export const validateTabIdArgs = (
  args: ToolArgValue | ToolArgObject,
): { tabId: number } => {
  const record = ensureObjectArgs(args),
    rawTabId = readObjectField(record, "tabId");
  return { tabId: parseTabId(rawTabId, "tabId") };
};

export const validateTabIdListArgs = (
  args: ToolArgValue | ToolArgObject,
): { tabIds: number[] } => {
  const record = ensureObjectArgs(args),
    rawTabIds = readObjectField(record, "tabIds");
  if (!Array.isArray(rawTabIds) || rawTabIds.length === 0) {
    throw new ToolInputErrorSafe("tabIds 必须是非空数组");
  }
  const tabIds = rawTabIds.map((rawTabId, index) =>
    parseTabId(rawTabId, `tabIds[${String(index)}]`),
  );
  return { tabIds };
};
