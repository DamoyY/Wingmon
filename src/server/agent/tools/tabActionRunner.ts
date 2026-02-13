type TabActionResult = {
  ok?: boolean;
  reason?: string;
  pageNumber?: number;
};

type TabDescriptor = {
  id?: number | null;
};

type ErrorWithMessage = {
  message: string;
};

type TabActionError = Error | ErrorWithMessage | string;

export type TabActionState<TResult> = {
  errors: string[];
  notFoundCount: number;
  done: boolean;
  tabId?: number;
  result?: TResult;
};

export type TabActionOptions<
  TResult,
  TTab = TabDescriptor,
  TMessage = TabActionResult,
  TReady = boolean,
> = {
  tabs: TTab[];
  waitForContentScript: (tabId: number) => Promise<TReady>;
  sendMessage: (tabId: number) => Promise<TMessage>;
  invalidResultMessage: string;
  buildErrorMessage: (error: TabActionError) => string;
  resolveTabId?: (tab: TTab) => number | null;
  resolveResult?: (candidate: TMessage) => TabActionResult;
  onSuccess?: (
    tabId: number,
    result: TabActionResult,
  ) => Promise<TResult> | TResult;
};

const defaultResolveTabId = (tab: TabDescriptor | null): number | null => {
  const raw = tab?.id;
  return typeof raw === "number" ? raw : null;
};

const defaultResolveResult = (
  candidate: TabActionResult | null,
): TabActionResult => {
  if (!candidate) {
    return {};
  }
  const result: TabActionResult = {};
  if (typeof candidate.ok === "boolean") {
    result.ok = candidate.ok;
  }
  if (typeof candidate.reason === "string") {
    result.reason = candidate.reason;
  }
  if (candidate.pageNumber !== undefined) {
    if (!Number.isInteger(candidate.pageNumber) || candidate.pageNumber <= 0) {
      throw new Error("pageNumber 必须是正整数");
    }
    result.pageNumber = candidate.pageNumber;
  }
  return result;
};

export const runTabAction = async <
  TResult,
  TTab = TabDescriptor,
  TMessage = TabActionResult,
  TReady = boolean,
>(
  options: TabActionOptions<TResult, TTab, TMessage, TReady>,
): Promise<TabActionState<TResult>> => {
  const {
    tabs,
    waitForContentScript,
    sendMessage,
    invalidResultMessage,
    buildErrorMessage,
    onSuccess,
  } = options;
  const resolveTabId =
      options.resolveTabId ??
      ((tab: TTab) => defaultResolveTabId(tab as TabDescriptor)),
    resolveResult =
      options.resolveResult ??
      ((candidate: TMessage) =>
        defaultResolveResult(candidate as TabActionResult));
  const initialState: TabActionState<TResult> = {
    done: false,
    errors: [],
    notFoundCount: 0,
  };
  return await tabs.reduce<Promise<TabActionState<TResult>>>(
    async (promise, tab) => {
      const state = await promise;
      if (state.done) {
        return state;
      }
      const tabId = resolveTabId(tab);
      if (tabId === null) {
        return { ...state, errors: [...state.errors, "标签页缺少 Tab ID"] };
      }
      try {
        await waitForContentScript(tabId);
        const result = resolveResult(await sendMessage(tabId));
        if (result.ok) {
          const nextState: TabActionState<TResult> = {
            ...state,
            done: true,
            tabId,
          };
          if (onSuccess) {
            nextState.result = await onSuccess(tabId, result);
          }
          return nextState;
        }
        if (result.ok === false && result.reason === "not_found") {
          return { ...state, notFoundCount: state.notFoundCount + 1 };
        }
        throw new Error(invalidResultMessage);
      } catch (error) {
        const errorValue: TabActionError =
            error instanceof Error
              ? error
              : typeof error === "string"
                ? error
                : error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof (error as ErrorWithMessage).message === "string"
                  ? { message: (error as ErrorWithMessage).message }
                  : "操作失败",
          message = buildErrorMessage(errorValue);
        return {
          ...state,
          errors: [...state.errors, `Tab ID ${String(tabId)}: ${message}`],
        };
      }
    },
    Promise.resolve(initialState),
  );
};
