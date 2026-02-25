import { extractErrorMessage } from "../utils/index.ts";

export type BrowserTab = chrome.tabs.Tab;

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
      const failure = new Error(
        extractErrorMessage(error, { fallback: "无法查询活动标签页" }),
      );
      console.error("查询活动标签页失败", { queryInfo }, failure);
      lastFailure = failure;
    }
  }
  if (lastFailure) {
    console.error(lastFailure.message);
    throw lastFailure;
  }
  const failure = new Error("未找到活动标签页");
  console.error(failure.message);
  throw failure;
};
