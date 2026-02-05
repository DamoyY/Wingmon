type TabActionResult = {
  ok?: boolean;
  reason?: string;
};

export type TabActionState<TResult> = {
  errors: string[];
  notFoundCount: number;
  done: boolean;
  tabId?: number;
  result?: TResult;
};

export type TabActionOptions<TResult> = {
  tabs: unknown[];
  waitForContentScript: (tabId: number) => Promise<unknown>;
  sendMessage: (tabId: number) => Promise<unknown>;
  invalidResultMessage: string;
  buildErrorMessage: (error: unknown) => string;
  resolveTabId?: (tab: unknown) => number | null;
  resolveResult?: (candidate: unknown) => TabActionResult;
  onSuccess?: (
    tabId: number,
    result: TabActionResult,
  ) => Promise<TResult> | TResult;
};

const defaultResolveTabId = (tab: unknown): number | null => {
  if (!tab || typeof tab !== "object") {
    return null;
  }
  const raw = (tab as { id?: unknown }).id;
  return typeof raw === "number" ? raw : null;
};

const defaultResolveResult = (candidate: unknown): TabActionResult => {
  if (!candidate || typeof candidate !== "object") {
    return {};
  }
  const record = candidate as Record<string, unknown>,
    ok = typeof record.ok === "boolean" ? record.ok : undefined,
    reason = typeof record.reason === "string" ? record.reason : undefined;
  return { ok, reason };
};

export const runTabAction = async <TResult>(
  options: TabActionOptions<TResult>,
): Promise<TabActionState<TResult>> => {
  const {
    tabs,
    waitForContentScript,
    sendMessage,
    invalidResultMessage,
    buildErrorMessage,
    resolveTabId = defaultResolveTabId,
    resolveResult = defaultResolveResult,
    onSuccess,
  } = options;
  const initialState: TabActionState<TResult> = {
    errors: [],
    notFoundCount: 0,
    done: false,
  };
  return await tabs.reduce<Promise<TabActionState<TResult>>>(
    async (promise, tab) => {
      const state = await promise;
      if (state.done) {
        return state;
      }
      const tabId = resolveTabId(tab);
      if (tabId === null) {
        return { ...state, errors: [...state.errors, "标签页缺少 TabID"] };
      }
      try {
        await waitForContentScript(tabId);
        const result = resolveResult(await sendMessage(tabId));
        if (result.ok) {
          const resultValue = onSuccess
            ? await onSuccess(tabId, result)
            : undefined;
          return {
            ...state,
            done: true,
            result: resultValue,
            tabId,
          };
        }
        if (result.ok === false && result.reason === "not_found") {
          return { ...state, notFoundCount: state.notFoundCount + 1 };
        }
        throw new Error(invalidResultMessage);
      } catch (error) {
        const message = buildErrorMessage(error);
        return {
          ...state,
          errors: [...state.errors, `TabID ${String(tabId)}: ${message}`],
        };
      }
    },
    Promise.resolve(initialState),
  );
};
