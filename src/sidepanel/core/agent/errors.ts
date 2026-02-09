type ToolInputErrorOptions = {
  tabId?: number | null;
};

const resolveToolInputErrorTabId = (
  tabId: number | null | undefined,
): number | null => {
  if (tabId === null || tabId === undefined) {
    return null;
  }
  if (!Number.isInteger(tabId) || tabId <= 0) {
    throw new Error("ToolInputError tabId 必须是正整数");
  }
  return tabId;
};

export default class ToolInputError extends Error {
  readonly tabId: number | null;

  constructor(message: string, options: ToolInputErrorOptions = {}) {
    super(message);
    this.name = "ToolInputError";
    this.tabId = resolveToolInputErrorTabId(options.tabId);
  }
}
