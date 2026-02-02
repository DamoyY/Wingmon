import { createTab, focusTab, saveHtmlPreview } from "../../services/index.js";
import { t } from "../../utils/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs } from "./utils.js";

const parameters = {
  type: "object",
  properties: { code: { type: "string" } },
  required: ["code"],
  additionalProperties: false,
};

const validateArgs = (args) => {
  ensureObjectArgs(args);
  if (typeof args.code !== "string" || !args.code.trim()) {
    throw new ToolInputError("code 必须是非空字符串");
  }
  return { code: args.code };
};

const execute = async ({ code }) => {
  const previewId = await saveHtmlPreview({ code });
  const url = chrome.runtime.getURL(
    `public/show-html.html?id=${encodeURIComponent(previewId)}`,
  );
  const tab = await createTab(url, true);
  await focusTab(tab.id);
  return "成功";
};

export default {
  key: "showHtml",
  name: "show_html",
  description: t("toolShowHtml"),
  parameters,
  validateArgs,
  execute,
};
