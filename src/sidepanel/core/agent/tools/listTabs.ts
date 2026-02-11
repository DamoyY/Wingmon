import { type JsonValue, t } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { ensureObjectArgs } from "../validation/index.js";

type ListTabsArgs = Record<string, never>;

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

const parameters = {
    additionalProperties: false,
    properties: {},
    required: [],
    type: "object",
  },
  buildListTabsOutput = (tabs: BrowserTab[]): string =>
    tabs
      .map((tab) => {
        const title = tab.title || t("statusNoTitle"),
          url = tab.url || t("statusNoAddress"),
          { id } = tab;
        return `${t("statusTitle")}: "${title}"\nURL: "${url}"\n${t("statusTabId")}: "${String(id)}"`;
      })
      .join("\n\n"),
  validateArgs = (args: JsonValue): ListTabsArgs => {
    ensureObjectArgs(args);
    return {};
  },
  execute = async (
    _args: ListTabsArgs,
    context: ToolExecutionContext,
  ): Promise<string> => {
    const tabs = await context.getAllTabs();
    return buildListTabsOutput(tabs);
  };

export default {
  description: t("toolListTabs"),
  execute,
  key: "listTabs",
  name: "list_tabs",
  parameters,
  validateArgs,
};
