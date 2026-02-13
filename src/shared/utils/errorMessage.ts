type ErrorLikeWithMessage = {
  message?: unknown;
};

export type ErrorMessageOptions = {
  fallback?: string;
  includeNonStringPrimitives?: boolean;
};

const hasMessageField = (value: unknown): value is ErrorLikeWithMessage =>
  typeof value === "object" && value !== null && "message" in value;

const resolveStringMessage = (value: string, fallback: string): string =>
  value.trim() ? value : fallback;

export const extractErrorMessage = (
  error: unknown,
  options: ErrorMessageOptions = {},
): string => {
  const fallback = options.fallback ?? "未知错误";
  if (error instanceof Error) {
    return resolveStringMessage(error.message, fallback);
  }
  if (typeof error === "string") {
    return resolveStringMessage(error, fallback);
  }
  if (typeof error === "number" || typeof error === "boolean") {
    if (options.includeNonStringPrimitives) {
      return String(error);
    }
    return fallback;
  }
  if (hasMessageField(error) && typeof error.message === "string") {
    return resolveStringMessage(error.message, fallback);
  }
  return fallback;
};
