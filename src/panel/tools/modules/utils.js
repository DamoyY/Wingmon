import ToolInputError from "../errors.js";

export const ensureObjectArgs = (args) => {
  if (!args || typeof args !== "object") {
    throw new ToolInputError("工具参数必须是对象");
  }
};

export const validateTabIdArgs = (args) => {
  ensureObjectArgs(args);
  const raw = args.tabId;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return { tabId: raw };
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ToolInputError("tabId 必须是正整数");
    }
    return { tabId: parsed };
  }
  throw new ToolInputError("tabId 必须是正整数");
};
