import type { ToolExecutionContext } from "../definitions.ts";
import { t } from "../../../shared/index.ts";

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
  execute = async (
    _args: Record<string, never>,
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
};
