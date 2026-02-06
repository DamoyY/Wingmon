type ErrorCtor = new (message: string) => Error;

const tryParsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      const parsedValue = Number(trimmedValue);
      if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }
  }
  return null;
};

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
