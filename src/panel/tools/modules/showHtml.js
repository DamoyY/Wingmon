import { createTab, focusTab, saveHtmlPreview } from "../../services/index.ts";
import { t } from "../../utils/index.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/index.js";

const parameters = {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
    additionalProperties: false,
  },
  validateArgs = (args) => {
    ensureObjectArgs(args);
    if (typeof args.code !== "string" || !args.code.trim()) {
      throw new ToolInputError("code 必须是非空字符串");
    }
    return { code: args.code };
  },
  execute = async ({ code }) => {
    const previewId = await saveHtmlPreview({ code }),
      url = chrome.runtime.getURL(
        `public/show-html.html?id=${encodeURIComponent(previewId)}`,
      ),
      tab = await createTab(url, true);
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
