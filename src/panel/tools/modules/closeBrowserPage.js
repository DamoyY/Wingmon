import { t } from "../../utils/index.ts";
import { closeTab } from "../../services/index.js";
import { validateTabIdArgs } from "../validation/index.js";

const parameters = {
    type: "object",
    properties: { tabId: { type: "number" } },
    required: ["tabId"],
    additionalProperties: false,
  },
  execute = async ({ tabId }) => {
    await closeTab(tabId);
    return t("statusSuccess");
  };

export default {
  key: "closeBrowserPage",
  name: "close_page",
  description: t("toolClosePage"),
  parameters,
  validateArgs: validateTabIdArgs,
  execute,
};
