type ResolveAliasedInputOptions<TInput, TResult> = {
  camelProvided: boolean;
  snakeProvided: boolean;
  camelValue: TInput | null;
  snakeValue: TInput | null;
  mismatchMessage: string;
  defaultValue: TResult;
  resolve: (value: TInput | null) => TResult;
  equals?: (left: TResult, right: TResult) => boolean;
};

export const resolveAliasedInput = <TInput, TResult>({
  camelProvided,
  snakeProvided,
  camelValue,
  snakeValue,
  mismatchMessage,
  defaultValue,
  resolve,
  equals,
}: ResolveAliasedInputOptions<TInput, TResult>): TResult => {
  if (!camelProvided && !snakeProvided) {
    return defaultValue;
  }
  const isEqual = equals ?? Object.is;
  if (camelProvided && snakeProvided) {
    const resolvedCamel = resolve(camelValue),
      resolvedSnake = resolve(snakeValue);
    if (!isEqual(resolvedCamel, resolvedSnake)) {
      throw new Error(mismatchMessage);
    }
    return resolvedCamel;
  }
  if (camelProvided) {
    return resolve(camelValue);
  }
  return resolve(snakeValue);
};
