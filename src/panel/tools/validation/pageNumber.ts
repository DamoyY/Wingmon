import ToolInputError from "../errors.ts";
import { parseRequiredPositiveInteger } from "./positiveInteger.js";
import type { JsonValue } from "../../utils/index.ts";

export const parsePageNumber = (value: JsonValue): number =>
  parseRequiredPositiveInteger(value, "page_number", ToolInputError);
