export const tryParsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
};

export const tryParsePositiveInteger = (value: unknown): number | null => {
  const parsedValue = tryParsePositiveNumber(value);
  if (parsedValue === null || !Number.isInteger(parsedValue)) {
    return null;
  }
  return parsedValue;
};

type ErrorCtor = new (message: string) => Error;

const positiveIntegerErrorMessage = "必须是正整数";
const positiveNumberErrorMessage = "必须是正数";

export const parseOptionalPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsedValue = tryParsePositiveInteger(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${positiveIntegerErrorMessage}`);
};

export const parseRequiredPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number => {
  const parsedValue = tryParsePositiveInteger(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${positiveIntegerErrorMessage}`);
};

export const parseOptionalPositiveNumber = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsedValue = tryParsePositiveNumber(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${positiveNumberErrorMessage}`);
};

export const parseRequiredPositiveNumber = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number => {
  const parsedValue = tryParsePositiveNumber(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${positiveNumberErrorMessage}`);
};
