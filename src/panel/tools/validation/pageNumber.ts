import ToolInputError from "../errors.js";
import { parseRequiredPositiveInteger } from "./positiveInteger.js";

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor;

export const parsePageNumber = (value: unknown): number =>
  parseRequiredPositiveInteger(value, "page_number", ToolInputErrorSafe);
