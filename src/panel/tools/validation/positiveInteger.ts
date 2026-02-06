import { tryParsePositiveInteger } from "../../../shared/index.ts";

type ErrorCtor = new (message: string) => Error;

export const parseOptionalPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsedValue = tryParsePositiveInteger(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} 必须是正整数`);
};

export const parseRequiredPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number => {
  const parsedValue = parseOptionalPositiveInteger(
    value,
    fieldName,
    ErrorClass,
  );
  if (parsedValue !== undefined) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} 必须是正整数`);
};
