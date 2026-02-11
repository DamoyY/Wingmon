export type PageNumberInput = number | null;

export const resolvePageNumberInput = (
  value: PageNumberInput,
  fieldName = "pageNumber",
): number => {
  if (value === null) {
    return 1;
  }
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new Error(`${fieldName} 必须是正整数`);
};
