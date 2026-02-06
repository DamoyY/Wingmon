import { t, type JsonValue } from "../../utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/index.js";

type ShowHtmlArgs = {
  code: string;
};

const parameters = {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
    additionalProperties: false,
  },
  validateArgs = (args: JsonValue): ShowHtmlArgs => {
    const record = ensureObjectArgs(args);
    if (typeof record.code !== "string" || !record.code.trim()) {
      throw new ToolInputError("code 必须是非空字符串");
    }
    return { code: record.code };
  },
  execute = async (
    { code }: ShowHtmlArgs,
    context: ToolExecutionContext,
  ): Promise<string> => {
    const previewId = await context.saveHtmlPreview({ code }),
      url = context.getRuntimeUrl(
        `public/show-html.html?id=${encodeURIComponent(previewId)}`,
      ),
      tab = await context.createTab(url, true);
    await context.focusTab(tab.id);
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
