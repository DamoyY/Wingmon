import { resolveAliasedInput } from "./aliasedInput.ts";
import { tryParsePositiveInteger } from "../../shared/index.ts";

export type PageNumberInput = number | string | null;

type ResolveAliasedPageNumberOptions<TDefault extends number | null> = {
  camelProvided: boolean;
  snakeProvided: boolean;
  camelValue: PageNumberInput;
  snakeValue: PageNumberInput;
  mismatchMessage: string;
  defaultValue: TDefault;
  fieldName?: string;
};

export const resolvePageNumberInput = (
  value: PageNumberInput,
  fieldName = "page_number",
): number => {
  if (value === null) {
    return 1;
  }
  const parsedValue = tryParsePositiveInteger(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new Error(`${fieldName} 必须是正整数`);
};

export function resolveAliasedPageNumberInput(
  options: ResolveAliasedPageNumberOptions<number>,
): number;
export function resolveAliasedPageNumberInput(
  options: ResolveAliasedPageNumberOptions<null>,
): number | null;
export function resolveAliasedPageNumberInput({
  camelProvided,
  snakeProvided,
  camelValue,
  snakeValue,
  mismatchMessage,
  defaultValue,
  fieldName,
}: ResolveAliasedPageNumberOptions<number | null>): number | null {
  return resolveAliasedInput<PageNumberInput, number | null>({
    camelProvided,
    camelValue,
    defaultValue,
    mismatchMessage,
    resolve: (value) => resolvePageNumberInput(value, fieldName),
    snakeProvided,
    snakeValue,
  });
}
