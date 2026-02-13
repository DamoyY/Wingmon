export type BrowserTab = chrome.tabs.Tab;

const normalizeError = (error: unknown, fallback: string): Error => {
  if (error instanceof Error) {
    if (error.message.trim()) {
      return error;
    }
    return new Error(fallback);
  }
  return new Error(fallback);
};

const logAndNormalizeError = (error: unknown, fallback: string): Error => {
  const failure = normalizeError(error, fallback);
  console.error(failure.message);
  return failure;
};

export const getActiveTab = async (): Promise<BrowserTab> => {
  const queryCandidates: chrome.tabs.QueryInfo[] = [
    { active: true, lastFocusedWindow: true, windowType: "normal" },
    { active: true, currentWindow: true, windowType: "normal" },
    { active: true, windowType: "normal" },
    { active: true },
  ];
  let lastFailure: Error | null = null;
  for (const queryInfo of queryCandidates) {
    try {
      const tabs = await chrome.tabs.query(queryInfo);
      const tab = tabs.find((item) => typeof item.id === "number");
      if (tab) {
        return tab;
      }
    } catch (error) {
      const failure = normalizeError(error, "无法查询活动标签页");
      console.error("查询活动标签页失败", { queryInfo }, failure);
      lastFailure = failure;
    }
  }
  if (lastFailure) {
    throw logAndNormalizeError(lastFailure, "无法查询活动标签页");
  }
  throw logAndNormalizeError(
    new Error("未找到活动标签页"),
    "无法查询活动标签页",
  );
};
