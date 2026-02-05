import ToolInputError from "../errors.js";

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor;

export const parsePageNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
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
