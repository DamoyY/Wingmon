import { t, type JsonValue } from "../../utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import { ensureObjectArgs } from "../validation/index.js";

type ListTabsArgs = Record<string, never>;

type BrowserTab = Awaited<
  ReturnType<ToolExecutionContext["getAllTabs"]>
>[number];

const parameters = {
    type: "object",
    properties: {},
    additionalProperties: false,
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
  key: "listTabs",
  name: "list_tabs",
  description: t("toolListTabs"),
  parameters,
  validateArgs,
  execute,
};
