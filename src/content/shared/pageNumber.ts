import { resolveAliasedInput } from "./aliasedInput.ts";

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
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
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
    snakeProvided,
    camelValue,
    snakeValue,
    mismatchMessage,
    defaultValue,
    resolve: (value) => resolvePageNumberInput(value, fieldName),
  });
}
