import { t } from "../../utils/index.ts";
import { closeTab } from "../../services/index.js";
import {
  type ToolArgObject,
  type ToolArgValue,
  validateTabIdListArgs,
} from "../validation/index.js";

type ClosePageArgs = {
  tabIds: number[];
};

const closeTabSafe = closeTab as (tabId: number) => Promise<void>,
  tSafe = t as (key: string, substitutions?: string | string[]) => string,
  validateArgs = (args: ToolArgValue | ToolArgObject): ClosePageArgs =>
    validateTabIdListArgs(args);

const parameters = {
    type: "object",
    properties: {
      tabIds: {
        type: "array",
        items: { type: "number" },
        minItems: 1,
        description: tSafe("toolParamTabIdList"),
      },
    },
    required: ["tabIds"],
    additionalProperties: false,
  },
  execute = async ({ tabIds }: ClosePageArgs): Promise<string> => {
    const outputs: string[] = [];
    for (const tabId of tabIds) {
      try {
        await closeTabSafe(tabId);
        outputs.push(tSafe("statusCloseTabSuccess", [String(tabId)]));
      } catch (error) {
        console.error(`关闭 TabID 为 ${String(tabId)} 的标签页失败`, error);
        outputs.push(tSafe("statusCloseTabFailed", [String(tabId)]));
      }
    }
    return outputs.join("\n");
  };

export default {
  key: "closeBrowserPage",
  name: "close_page",
  description: tSafe("toolClosePage"),
  parameters,
  validateArgs,
  execute,
};
