import type { ToolExecutionContext } from "../definitions.ts";
import { t } from "../../../lib/utils/index.ts";

type ShowHtmlArgs = {
  code: string;
};

const parameters = {
    additionalProperties: false,
    properties: { code: { minLength: 1, pattern: "\\S", type: "string" } },
    required: ["code"],
    type: "object",
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
};
