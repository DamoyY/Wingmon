import ToolInputError from "../errors.js";

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor;

export const parsePageNumber = (value: unknown): number => {
  if (value === undefined || value === null) {
    throw new ToolInputErrorSafe("page_number 必须是正整数");
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new ToolInputErrorSafe("page_number 必须是正整数");
};
