import {
  tryParsePositiveInteger,
  tryParsePositiveNumber,
} from "../../../../shared/index.ts";

type ErrorCtor = new (message: string) => Error;
type ValueParser<TValue> = (value: unknown) => TValue | null;

const parseOptionalBy = <TValue>({
  value,
  fieldName,
  parser,
  invalidMessage,
  ErrorClass,
}: {
  value: unknown;
  fieldName: string;
  parser: ValueParser<TValue>;
  invalidMessage: string;
  ErrorClass: ErrorCtor;
}): TValue | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsedValue = parser(value);
  if (parsedValue !== null) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${invalidMessage}`);
};

const parseRequiredBy = <TValue>({
  value,
  fieldName,
  parser,
  invalidMessage,
  ErrorClass,
}: {
  value: unknown;
  fieldName: string;
  parser: ValueParser<TValue>;
  invalidMessage: string;
  ErrorClass: ErrorCtor;
}): TValue => {
  const parsedValue = parseOptionalBy({
    value,
    fieldName,
    parser,
    invalidMessage,
    ErrorClass,
  });
  if (parsedValue !== undefined) {
    return parsedValue;
  }
  throw new ErrorClass(`${fieldName} ${invalidMessage}`);
};

export const parseOptionalPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number | undefined => {
  return parseOptionalBy({
    value,
    fieldName,
    parser: tryParsePositiveInteger,
    invalidMessage: "必须是正整数",
    ErrorClass,
  });
};

export const parseRequiredPositiveInteger = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number => {
  return parseRequiredBy({
    value,
    fieldName,
    parser: tryParsePositiveInteger,
    invalidMessage: "必须是正整数",
    ErrorClass,
  });
};

export const parseOptionalPositiveNumber = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number | undefined => {
  return parseOptionalBy({
    value,
    fieldName,
    parser: tryParsePositiveNumber,
    invalidMessage: "必须是正数",
    ErrorClass,
  });
};

export const parseRequiredPositiveNumber = (
  value: unknown,
  fieldName: string,
  ErrorClass: ErrorCtor = Error,
): number => {
  return parseRequiredBy({
    value,
    fieldName,
    parser: tryParsePositiveNumber,
    invalidMessage: "必须是正数",
    ErrorClass,
  });
};
