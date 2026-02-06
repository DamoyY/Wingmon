import { t } from "../../../lib/utils/index.ts";
import type { JsonValue } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { formatCloseBrowserPageResult } from "../toolResultFormatters.ts";
import type { CloseBrowserPageToolResult } from "../toolResultTypes.ts";
import { validateTabIdListArgs } from "../validation/toolArgsValidation.ts";

type ClosePageArgs = {
  tabIds: number[];
};

const validateArgs = (args: JsonValue): ClosePageArgs =>
  validateTabIdListArgs(args);

const parameters = {
    type: "object",
    properties: {
      tabIds: {
        type: "array",
        items: { type: "number" },
        minItems: 1,
        description: t("toolParamTabIdList"),
      },
    },
    required: ["tabIds"],
    additionalProperties: false,
  },
  execute = async (
    { tabIds }: ClosePageArgs,
    context: ToolExecutionContext,
  ): Promise<CloseBrowserPageToolResult> => {
    const items: CloseBrowserPageToolResult["items"] = [];
    for (const tabId of tabIds) {
      try {
        await context.closeTab(tabId);
        items.push({ tabId, ok: true });
      } catch (error) {
        console.error(`关闭 TabID 为 ${String(tabId)} 的标签页失败`, error);
        items.push({ tabId, ok: false });
      }
    }
    return { items };
  };

export default {
  key: "closeBrowserPage",
  name: "close_page",
  description: t("toolClosePage"),
  parameters,
  validateArgs,
  execute,
  formatResult: formatCloseBrowserPageResult,
};
