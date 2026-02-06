const tryParsePositiveNumberFromNumber = (value: number): number | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
};

const tryParsePositiveNumberFromString = (value: string): number | null => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }
  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }
  return parsedValue;
};

export const tryParsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return tryParsePositiveNumberFromNumber(value);
  }
  if (typeof value === "string") {
    return tryParsePositiveNumberFromString(value);
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
