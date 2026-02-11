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
