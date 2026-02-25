import { getSettings } from "../../services/index.ts";

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettings();
  if (!settings.followMode) {
    return false;
  }
  const sidePanelContexts = await chrome.runtime.getContexts({
    contextTypes: ["SIDE_PANEL"],
  });
  return sidePanelContexts.length > 0;
};
