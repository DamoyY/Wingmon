import ToolInputError from "../errors.ts";
import { parseRequiredPositiveInteger } from "./positiveInteger.js";
import type { JsonValue } from "../../../lib/utils/index.ts";

type ToolPrimitive = string | number | boolean | null;

export type ToolArgValue = ToolPrimitive | ToolPrimitive[];

export type ToolArgObject = Record<string, ToolArgValue>;

const isToolArgObject = (value: JsonValue): value is ToolArgObject =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  readObjectField = (record: ToolArgObject, key: string): ToolArgValue =>
    Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null;

export const ensureObjectArgs = (args: JsonValue): ToolArgObject => {
  if (!isToolArgObject(args)) {
    throw new ToolInputError("工具参数必须是对象");
  }
  return args;
};

export const validateTabIdArgs = (args: JsonValue): { tabId: number } => {
  const record = ensureObjectArgs(args),
    rawTabId = readObjectField(record, "tabId");
  return {
    tabId: parseRequiredPositiveInteger(rawTabId, "Tab ID", ToolInputError),
  };
};

export const validateTabIdListArgs = (
  args: JsonValue,
): { tabIds: number[] } => {
  const record = ensureObjectArgs(args),
    rawTabIds = readObjectField(record, "tabIds");
  if (!Array.isArray(rawTabIds) || rawTabIds.length === 0) {
    throw new ToolInputError("Tab IDs 必须是非空数组");
  }
  const tabIds = rawTabIds.map((rawTabId, index) =>
    parseRequiredPositiveInteger(
      rawTabId,
      `Tab IDs[${String(index)}]`,
      ToolInputError,
    ),
  );
  return { tabIds };
};
