export const apiRetryTimeoutMs = 60000,
  apiRetryBaseDelayMs = 500,
  normalizeError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === "string" && error.trim()) return new Error(error);
    return new Error("请求失败");
  },
  createAbortError = (): Error => {
    const abortError = new Error("请求已取消");
    abortError.name = "AbortError";
    return abortError;
  },
  createEmptyStreamError = (): Error => {
    const streamError = new Error("流式响应为空");
    streamError.name = "EmptyStreamError";
    return streamError;
  },
  isAbortError = (error: unknown): boolean =>
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "APIUserAbortError"),
  isEmptyStreamError = (error: unknown): boolean =>
    error instanceof Error && error.name === "EmptyStreamError",
  waitForDelay = (delayMs: number, signal: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(createAbortError());
        return;
      }
      const onAbort = (): void => {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          reject(createAbortError());
        },
        timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
      signal.addEventListener("abort", onAbort, { once: true });
    }),
  resolveRetryDelay = (attemptIndex: number): number =>
    apiRetryBaseDelayMs * 2 ** attemptIndex;

export async function requestWithRetry<TResult>({
  requestTag,
  request,
  signal,
  extractStatusCode,
}: {
  requestTag: string;
  request: () => Promise<TResult>;
  signal: AbortSignal;
  extractStatusCode: (error: unknown) => number | null;
}): Promise<TResult> {
  const startedAt = Date.now();
  let attemptIndex = 0;
  for (;;) {
    try {
      return await request();
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        throw createAbortError();
      }
      const failure = normalizeError(error),
        elapsedMs = Date.now() - startedAt,
        remainingMs = apiRetryTimeoutMs - elapsedMs,
        statusCode = extractStatusCode(error),
        attemptsMade = attemptIndex + 1;
      if (remainingMs <= 0) {
        console.error("API 请求失败，已达到重试时限", {
          attemptsMade,
          elapsedMs,
          message: failure.message,
          requestTag,
          statusCode,
        });
        throw failure;
      }
      const delayMs = Math.min(resolveRetryDelay(attemptIndex), remainingMs);
      console.warn("API 请求失败，准备指数退避重试", {
        attemptsMade,
        delayMs,
        elapsedMs,
        message: failure.message,
        requestTag,
        statusCode,
      });
      await waitForDelay(delayMs, signal);
      attemptIndex += 1;
    }
  }
}
