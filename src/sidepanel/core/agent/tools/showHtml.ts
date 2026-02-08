import { type JsonValue, t } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/index.js";

type ShowHtmlArgs = {
  code: string;
};

const parameters = {
    additionalProperties: false,
    properties: { code: { type: "string" } },
    required: ["code"],
    type: "object",
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
  description: t("toolShowHtml"),
  execute,
  key: "showHtml",
  name: "show_html",
  parameters,
  validateArgs,
};
