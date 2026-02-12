import type { CloseBrowserPageToolResult } from "../toolResultTypes.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { formatCloseBrowserPageResult } from "../toolResultFormatters.ts";
import { t } from "../../../lib/utils/index.ts";

type ClosePageArgs = {
  tabIds: number[];
};

const parameters = {
    additionalProperties: false,
    properties: {
      tabIds: {
        description: t("toolParamTabIdList"),
        items: { minimum: 1, type: "integer" },
        minItems: 1,
        type: "array",
      },
    },
    required: ["tabIds"],
    type: "object",
  },
  execute = async (
    { tabIds }: ClosePageArgs,
    context: ToolExecutionContext,
  ): Promise<CloseBrowserPageToolResult> => {
    const items: CloseBrowserPageToolResult["items"] = [];
    for (const tabId of tabIds) {
      try {
        await context.closeTab(tabId);
        items.push({ ok: true, tabId });
      } catch (error) {
        console.error(`关闭 Tab ID 为 ${String(tabId)} 的标签页失败`, error);
        items.push({ ok: false, tabId });
      }
    }
    return { items };
  };

export default {
  description: t("toolClosePage"),
  execute,
  formatResult: formatCloseBrowserPageResult,
  key: "closeBrowserPage",
  name: "close_tab",
  parameters,
};
