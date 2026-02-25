import {
  reloadTab,
  sendMessageToTab,
  waitForContentScript,
} from "../../services/index.ts";
import type { PageHashSyncData } from "./contracts.ts";
import { buildPageHashMessage } from "./messageBuilders.ts";

export const syncPageHash = async (
  tabId: number,
  pageData?: PageHashSyncData,
): Promise<void> => {
  await waitForContentScript(tabId);
  const response = await sendMessageToTab(
    tabId,
    buildPageHashMessage(tabId, pageData),
  );
  if (response.skipped) {
    return;
  }
  if (!response.shouldReload) {
    return;
  }
  await reloadTab(tabId);
};
