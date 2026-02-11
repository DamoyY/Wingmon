import type { JsonValue } from "../../../lib/utils/index.ts";
import ToolInputError from "../errors.ts";
import { parseRequiredPositiveInteger } from "./positiveInteger.js";

export const parsePageNumber = (value: JsonValue): number =>
  parseRequiredPositiveInteger(value, "pageNumber", ToolInputError);
