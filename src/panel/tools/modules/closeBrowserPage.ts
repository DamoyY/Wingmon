import { t } from "../../utils/index.ts";
import type { JsonValue } from "../../utils/index.ts";
import { closeTab } from "../../services/index.ts";
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
  execute = async ({ tabIds }: ClosePageArgs): Promise<string> => {
    const outputs: string[] = [];
    for (const tabId of tabIds) {
      try {
        await closeTab(tabId);
        outputs.push(t("statusCloseTabSuccess", [String(tabId)]));
      } catch (error) {
        console.error(`关闭 TabID 为 ${String(tabId)} 的标签页失败`, error);
        outputs.push(t("statusCloseTabFailed", [String(tabId)]));
      }
    }
    return outputs.join("\n");
  };

export default {
  key: "closeBrowserPage",
  name: "close_page",
  description: t("toolClosePage"),
  parameters,
  validateArgs,
  execute,
};
